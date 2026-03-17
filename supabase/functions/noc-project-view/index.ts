import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via EIXONOC API key
    const nocApiKey = Deno.env.get("EIXONOC_API_KEY");
    const providedKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!nocApiKey || providedKey !== nocApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    const view = url.searchParams.get("view") || "equipment";

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "project_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (view === "equipment") {
      return await handleEquipmentView(supabase, projectId);
    } else if (view === "details") {
      return await handleDetailsView(supabase, projectId);
    } else if (view === "form") {
      return await handleFormView(supabase, projectId);
    } else {
      return new Response(
        JSON.stringify({ error: "view inválido. Use: equipment, details, form" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e: any) {
    console.error("noc-project-view error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleEquipmentView(supabase: any, projectId: string) {
  // Fetch LISTA_EQUIPAMENTOS attachments
  const { data: attachments, error: attError } = await supabase
    .from("project_attachments")
    .select("arquivo_url, nome_arquivo")
    .eq("project_id", projectId)
    .eq("tipo", "LISTA_EQUIPAMENTOS");

  if (attError) throw attError;

  if (!attachments || attachments.length === 0) {
    // Check engineering status
    const { data: project } = await supabase
      .from("projects")
      .select("engineering_status")
      .eq("id", projectId)
      .single();

    const passouPeloProjetista =
      project?.engineering_status && project.engineering_status !== "AGUARDANDO";

    return new Response(
      JSON.stringify({
        equipamentos: [],
        message: passouPeloProjetista
          ? 'Nenhum arquivo de "Lista de Equipamentos" encontrado na Devolução da Engenharia.'
          : "Este projeto não passou pela etapa de Engenharia/Projetista.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Generate signed URLs
  const fileUrls: string[] = [];
  for (const att of attachments) {
    if (
      !att.arquivo_url ||
      att.arquivo_url.startsWith("blob:") ||
      att.arquivo_url.startsWith("data:")
    )
      continue;

    let storagePath: string | null = null;
    const signMatch = att.arquivo_url.match(
      /\/storage\/v1\/object\/sign\/([^?]+)/
    );
    const pubMatch = att.arquivo_url.match(
      /\/storage\/v1\/object\/public\/([^?]+)/
    );
    const match = signMatch || pubMatch;
    if (match) {
      const fullPath = decodeURIComponent(match[1]);
      storagePath = fullPath.split("/").slice(1).join("/");
    }

    if (storagePath) {
      const { data: signedData } = await supabase.storage
        .from("project-attachments")
        .createSignedUrl(storagePath, 600);
      if (signedData?.signedUrl) {
        fileUrls.push(signedData.signedUrl);
      }
    }
  }

  if (fileUrls.length === 0) {
    return new Response(
      JSON.stringify({
        equipamentos: [],
        message: "Não foi possível acessar os arquivos de equipamentos.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Call AI to extract equipment list
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const contentParts: Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }> = [];
  contentParts.push({
    type: "text",
    text: "Extraia a lista completa de equipamentos dos documentos a seguir. Retorne APENAS o JSON estruturado.",
  });

  let filesProcessed = 0;
  for (const fileUrl of fileUrls) {
    if (filesProcessed >= 5) break;
    const fileData = await downloadAsBase64(fileUrl);
    if (!fileData) continue;
    contentParts.push({
      type: "text",
      text: `\n📄 Documento ${filesProcessed + 1}:`,
    });
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${fileData.mimeType};base64,${fileData.base64}`,
      },
    });
    filesProcessed++;
  }

  if (filesProcessed === 0) {
    return new Response(
      JSON.stringify({
        equipamentos: [],
        message: "Não foi possível processar os arquivos.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = `Você é um especialista em análise de documentos técnicos de projetos de portaria digital e segurança condominial da empresa Emive.

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE
🔴 Extraia os dados EXATAMENTE como constam nos documentos fornecidos. NUNCA invente equipamentos ou quantidades que não estejam nos documentos.

Sua tarefa é extrair a LISTA DE EQUIPAMENTOS de documentos PDF fornecidos e retornar em formato JSON estruturado.

## REGRAS CRÍTICAS PARA CÓDIGOS:
- **PRIORIDADE MÁXIMA**: Extraia o CÓDIGO de cada equipamento.
- Procure códigos em colunas como "Código", "Cód.", "Ref.", "SKU", "Modelo", "Part Number" ou similares
- NÃO deixe o campo código vazio se houver qualquer identificador alfanumérico associado ao item

Formato de resposta (JSON puro):
{
  "equipamentos": [
    {
      "categoria": "CFTV",
      "codigo": "CAM-IP-2MP",
      "item": "Câmera IP Bullet 2MP",
      "quantidade": 8,
      "unidade": "un",
      "observacoes": ""
    }
  ]
}`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
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
    }
  );

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return new Response(
      JSON.stringify({ error: "Erro ao extrair lista de equipamentos." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "{}";
  content = content
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { equipamentos: [] };
  }

  // Enrich with pricing
  const equipamentos = parsed.equipamentos || [];
  const codes = [
    ...new Set(equipamentos.map((e: any) => e.codigo).filter(Boolean)),
  ];

  let productsMap: Record<
    string,
    { preco_unitario: number; valor_locacao: number }
  > = {};
  if (codes.length > 0) {
    const { data: products } = await supabase
      .from("orcamento_produtos")
      .select("codigo, preco_unitario, valor_locacao")
      .in("codigo", codes)
      .eq("ativo", true);

    if (products) {
      for (const p of products) {
        if (p.codigo) {
          productsMap[p.codigo] = {
            preco_unitario: Number(p.preco_unitario) || 0,
            valor_locacao: Number(p.valor_locacao) || 0,
          };
        }
      }
    }
  }

  const pricedEquipamentos = equipamentos.map((eq: any) => {
    const prod = eq.codigo ? productsMap[eq.codigo] : undefined;
    return {
      ...eq,
      preco_venda_unitario: prod?.preco_unitario || 0,
      preco_venda_total: (prod?.preco_unitario || 0) * (eq.quantidade || 0),
      preco_locacao_unitario: prod?.valor_locacao || 0,
      preco_locacao_total: (prod?.valor_locacao || 0) * (eq.quantidade || 0),
      encontrado_catalogo: !!prod,
    };
  });

  const totalVenda = pricedEquipamentos.reduce(
    (s: number, i: any) => s + i.preco_venda_total,
    0
  );
  const totalLocacao = pricedEquipamentos.reduce(
    (s: number, i: any) => s + i.preco_locacao_total,
    0
  );

  return new Response(
    JSON.stringify({
      equipamentos: pricedEquipamentos,
      totais: {
        venda: totalVenda,
        locacao: totalLocacao,
        itens: pricedEquipamentos.length,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleDetailsView(supabase: any, projectId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  const { data: customerPortfolio } = await supabase
    .from("customer_portfolio")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: etapas } = await supabase
    .from("implantacao_etapas")
    .select("*")
    .eq("project_id", projectId)
    .single();

  const { data: comments } = await supabase
    .from("project_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return new Response(
    JSON.stringify({
      project,
      customer: customerPortfolio,
      implantacao: etapas,
      comentarios: comments || [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleFormView(supabase: any, projectId: string) {
  const { data: saleForm } = await supabase
    .from("sale_forms")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: tapForm } = await supabase
    .from("tap_forms")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: attachments } = await supabase
    .from("sale_form_attachments")
    .select("*")
    .eq("project_id", projectId);

  return new Response(
    JSON.stringify({
      sale_form: saleForm,
      tap_form: tapForm,
      anexos: attachments || [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function downloadAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType =
      resp.headers.get("content-type") || "application/octet-stream";
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
