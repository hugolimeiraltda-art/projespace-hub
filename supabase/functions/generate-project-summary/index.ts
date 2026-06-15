import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Downloads a file from a URL and returns it as base64 with its mime type.
 */
async function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Manual base64 encoding for Deno compatibility
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

/**
 * Extracts text from a PDF using basic text extraction.
 * Since we can't use heavy PDF parsing libraries in edge functions,
 * we'll pass the PDF as an image to Gemini for OCR/analysis.
 */
function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { saleFormData, projectInfo, tapFormData, comments, attachments, attachmentSignedUrls } = await req.json();

    // SSRF guard: only allow Supabase storage URLs in attachmentSignedUrls
    if (Array.isArray(attachmentSignedUrls)) {
      const allowedHost = new URL(Deno.env.get("SUPABASE_URL")!).hostname;
      for (const att of attachmentSignedUrls) {
        try {
          const h = new URL(att.url).hostname;
          if (h !== allowedHost) {
            return new Response(JSON.stringify({ error: "Invalid attachment URL host" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } catch {
          return new Response(JSON.stringify({ error: "Invalid attachment URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em projetos de portaria digital e segurança condominial da empresa Emive.

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE
🔴 Sua PRIMEIRA e PRINCIPAL fonte de conhecimento são os dados internos do projeto fornecidos (TAP, formulário de venda, comentários, anexos, fotos). NUNCA invente dados que não foram fornecidos. Conhecimento técnico externo pode ser usado APENAS como complemento secundário para contextualizar, e deve ser claramente identificado.

Seu papel é analisar TODOS os dados disponíveis de um projeto — incluindo TAP (Termo de Abertura de Projeto), formulário de venda, comentários da equipe, lista de anexos, e IMAGENS/FOTOS fornecidas — e gerar um resumo completo e profissional do escopo do projeto.

Regras:
- Escreva em português brasileiro formal
- Seja objetivo e técnico, mas acessível
- Organize por tópicos relevantes (Infraestrutura, CFTV, Alarme, Controle de Acesso, etc.)
- Mencione apenas os itens que foram preenchidos/informados
- Use números e quantidades sempre que disponíveis
- Destaque pontos de atenção quando houver
- Analise os comentários da equipe para extrair informações relevantes, decisões tomadas ou pendências
- Analise as IMAGENS fornecidas (fotos do condomínio, equipamentos, croquis, plantas) e descreva o que você observa nelas
- Se houver PDFs analisados, extraia e inclua as informações relevantes
- Mencione os anexos disponíveis quando relevantes
- Termine com um breve resumo geral do porte do projeto
- NÃO invente dados que não foram fornecidos
- Se usar conhecimento técnico externo como contexto, marque com "💡 Contexto técnico:"`;

    // Build multimodal content parts
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    let userPromptText = `Gere um resumo executivo completo deste projeto de portaria digital:\n\n`;

    if (projectInfo) {
      userPromptText += `**Informações do Projeto:**\n- Condomínio: ${projectInfo.nome}\n- Cidade: ${projectInfo.cidade}, ${projectInfo.estado}\n- Vendedor: ${projectInfo.vendedor}\n\n`;
    }

    if (tapFormData && Object.keys(tapFormData).length > 0) {
      userPromptText += `**Dados do TAP (Termo de Abertura de Projeto):**\n${JSON.stringify(tapFormData, null, 2)}\n\n`;
    }

    if (saleFormData && Object.keys(saleFormData).length > 0) {
      userPromptText += `**Dados do Formulário de Venda:**\n${JSON.stringify(saleFormData, null, 2)}\n\n`;
    }

    if (comments && comments.length > 0) {
      userPromptText += `**Comentários da Equipe (histórico de discussão do projeto):**\n${comments.join('\n')}\n\n`;
    }

    if (attachments && attachments.length > 0) {
      userPromptText += `**Anexos disponíveis no projeto:**\n${attachments.join('\n')}\n\n`;
    }

    userPromptText += `Gere o resumo do escopo do projeto baseado em TODOS esses dados.`;

    // Add the text part first
    contentParts.push({ type: "text", text: userPromptText });

    // Process attachment files (images, PDFs)
    if (attachmentSignedUrls && Array.isArray(attachmentSignedUrls)) {
      let imageCount = 0;
      const MAX_IMAGES = 15; // Limit to avoid payload too large

      for (const att of attachmentSignedUrls) {
        if (imageCount >= MAX_IMAGES) break;

        try {
          const fileData = await downloadAsBase64(att.url);
          if (!fileData) continue;

          if (isImage(fileData.mimeType)) {
            // Add image directly to multimodal content
            contentParts.push({
              type: "text",
              text: `\n📷 Foto do projeto: "${att.nome}" (${att.tipo}):`
            });
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${fileData.mimeType};base64,${fileData.base64}` }
            });
            imageCount++;
          } else if (isPdf(fileData.mimeType)) {
            // For PDFs, send as a document to Gemini for analysis
            // Gemini can read PDFs when sent as base64 images with application/pdf mime
            contentParts.push({
              type: "text",
              text: `\n📄 Documento PDF do projeto: "${att.nome}" (${att.tipo}). Analise o conteúdo abaixo, especialmente tabelas de lista de equipamentos:`
            });
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${fileData.base64}` }
            });
            imageCount++;
          } else if (isVideo(fileData.mimeType)) {
            // For videos, just mention them (too large for multimodal)
            contentParts.push({
              type: "text",
              text: `\n🎥 Vídeo disponível: "${att.nome}" (${att.tipo}) - Vídeo não pode ser analisado diretamente, mas o nome e contexto sugerem conteúdo relevante.`
            });
          }
        } catch (e) {
          console.error(`Failed to process attachment ${att.nome}:`, e);
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentParts },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para geração de resumo." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar resumo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-project-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
