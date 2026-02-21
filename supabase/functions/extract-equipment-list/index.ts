import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { base64, mimeType: contentType.split(";")[0].trim() };
  } catch (e) {
    console.error("Failed to download file:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo fornecido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em análise de documentos técnicos de projetos de portaria digital e segurança condominial da empresa Emive.

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE
🔴 Extraia os dados EXATAMENTE como constam nos documentos fornecidos. NUNCA invente equipamentos ou quantidades que não estejam nos documentos. Se reconhecer equipamentos do catálogo Emive, use os nomes padronizados do catálogo.

Sua tarefa é extrair a LISTA DE EQUIPAMENTOS de documentos PDF fornecidos e retornar em formato JSON estruturado.

Regras:
- Analise cuidadosamente tabelas, listas e textos nos documentos
- Extraia TODOS os equipamentos mencionados com suas quantidades
- Para cada equipamento, extraia: item (nome/descrição), quantidade, unidade (se disponível), observações (se houver)
- Se houver categorias/seções (ex: CFTV, Controle de Acesso, Alarme), inclua a categoria
- Retorne APENAS o JSON, sem texto adicional
- Se não encontrar lista de equipamentos, retorne um array vazio

Formato de resposta (JSON puro):
{
  "equipamentos": [
    {
      "categoria": "CFTV",
      "item": "Câmera IP Bullet 2MP",
      "quantidade": 8,
      "unidade": "un",
      "observacoes": ""
    }
  ]
}`;

    // Build multimodal content
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    contentParts.push({ type: "text", text: "Extraia a lista completa de equipamentos dos documentos a seguir. Retorne APENAS o JSON estruturado." });

    let filesProcessed = 0;
    for (const fileUrl of fileUrls) {
      if (filesProcessed >= 5) break;
      const fileData = await downloadAsBase64(fileUrl);
      if (!fileData) continue;

      contentParts.push({
        type: "text",
        text: `\n📄 Documento ${filesProcessed + 1}:`
      });
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:${fileData.mimeType};base64,${fileData.base64}` }
      });
      filesProcessed++;
    }

    if (filesProcessed === 0) {
      return new Response(JSON.stringify({ error: "Não foi possível processar os arquivos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentParts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao extrair lista de equipamentos." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { equipamentos: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-equipment-list error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
