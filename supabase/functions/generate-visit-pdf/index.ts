import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessao_id } = await req.json();
    if (!sessao_id) throw new Error("sessao_id is required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session data
    const { data: sessao, error: sessaoErr } = await supabase
      .from("orcamento_sessoes")
      .select("*")
      .eq("id", sessao_id)
      .single();
    if (sessaoErr || !sessao) throw new Error("Sessão não encontrada");

    // Fetch messages
    const { data: mensagens } = await supabase
      .from("orcamento_mensagens")
      .select("role, content, created_at")
      .eq("sessao_id", sessao_id)
      .order("created_at", { ascending: true });

    // Fetch media files
    const { data: midias } = await supabase
      .from("orcamento_midias")
      .select("*")
      .eq("sessao_id", sessao_id)
      .order("created_at", { ascending: true });

    // Generate signed URLs for media
    const mediasWithUrls = [];
    if (midias && midias.length > 0) {
      for (const m of midias) {
        const { data: urlData } = await supabase.storage
          .from("orcamento-midias")
          .createSignedUrl(m.arquivo_url, 60 * 60 * 24); // 24h
        mediasWithUrls.push({
          ...m,
          signed_url: urlData?.signedUrl || null,
        });
      }
    }

    // Build HTML for PDF
    const html = buildPdfHtml(sessao, mensagens || [], mediasWithUrls);

    // Use Lovable AI to generate a structured summary for the PDF
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let resumoVisita = "";
    if (LOVABLE_API_KEY && mensagens && mensagens.length > 0) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: `Extraia um resumo estruturado da visita técnica a partir do histórico de conversa. Formate em markdown com seções: Informações Gerais, Acesso de Pedestres, Acesso de Veículos, CFTV, Perímetro, Interfonia, Infraestrutura. Inclua apenas dados mencionados. Seja conciso.` },
              ...mensagens.map((m: any) => ({ role: m.role, content: m.content })),
              { role: "user", content: "Gere o resumo estruturado da visita." },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          resumoVisita = data.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("Failed to generate summary:", e);
      }
    }

    return new Response(
      JSON.stringify({
        html,
        resumo_visita: resumoVisita,
        sessao: {
          nome_cliente: sessao.nome_cliente,
          endereco_condominio: sessao.endereco_condominio,
          email_cliente: sessao.email_cliente,
          telefone_cliente: sessao.telefone_cliente,
          vendedor_nome: sessao.vendedor_nome,
          proposta_gerada: sessao.proposta_gerada,
          created_at: sessao.created_at,
        },
        midias: mediasWithUrls,
        mensagens_count: mensagens?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-visit-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPdfHtml(sessao: any, mensagens: any[], midias: any[]): string {
  const fotos = midias.filter(m => m.tipo === 'foto' && m.signed_url);
  const dataVisita = new Date(sessao.created_at).toLocaleDateString('pt-BR');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; font-size: 13px; line-height: 1.5; }
  h1 { color: #0f4c81; font-size: 22px; border-bottom: 3px solid #0f4c81; padding-bottom: 8px; }
  h2 { color: #0f4c81; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .header-info div { font-size: 12px; }
  .header-info strong { color: #333; }
  .chat-msg { margin: 4px 0; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
  .chat-user { background: #e3f2fd; border-left: 3px solid #1976d2; }
  .chat-assistant { background: #f5f5f5; border-left: 3px solid #666; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
  .photos img { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
  .proposta { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .footer { text-align: center; color: #999; font-size: 10px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
  <h1>📋 Relatório de Visita Técnica</h1>
  <div class="header-info">
    <div><strong>Condomínio:</strong> ${sessao.nome_cliente}</div>
    <div><strong>Data:</strong> ${dataVisita}</div>
    ${sessao.endereco_condominio ? `<div><strong>Endereço:</strong> ${sessao.endereco_condominio}</div>` : ''}
    ${sessao.vendedor_nome ? `<div><strong>Vendedor:</strong> ${sessao.vendedor_nome}</div>` : ''}
    ${sessao.email_cliente ? `<div><strong>Email:</strong> ${sessao.email_cliente}</div>` : ''}
    ${sessao.telefone_cliente ? `<div><strong>Telefone:</strong> ${sessao.telefone_cliente}</div>` : ''}
  </div>

  <h2>💬 Histórico da Visita</h2>
  ${mensagens.map(m => `<div class="chat-msg ${m.role === 'user' ? 'chat-user' : 'chat-assistant'}"><strong>${m.role === 'user' ? '👤 Vendedor' : '🤖 IA'}:</strong> ${escapeHtml(m.content)}</div>`).join('')}

  ${fotos.length > 0 ? `
  <h2>📸 Fotos da Visita (${fotos.length})</h2>
  <div class="photos">
    ${fotos.map(f => `<img src="${f.signed_url}" alt="${f.nome_arquivo}" />`).join('')}
  </div>
  ` : ''}

  ${sessao.proposta_gerada ? `
  <h2>📄 Proposta Comercial</h2>
  <div class="proposta">${sessao.proposta_gerada.replace(/\n/g, '<br>')}</div>
  ` : ''}

  <div class="footer">
    Emive - Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}
