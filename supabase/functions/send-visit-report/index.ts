import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    const { sessao_id, email_destino, html_content } = await req.json();
    if (!sessao_id) throw new Error("sessao_id is required");

    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_APP_PASSWORD) throw new Error("GMAIL_APP_PASSWORD not configured");

    const GMAIL_USER = "hugolimeira@gmail.com";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session info
    const { data: sessao } = await supabase
      .from("orcamento_sessoes")
      .select("nome_cliente, vendedor_nome, vendedor_id")
      .eq("id", sessao_id)
      .single();

    if (!sessao) throw new Error("Sessão não encontrada");

    // If no email provided, get vendedor's email
    let targetEmail = email_destino;
    if (!targetEmail && sessao.vendedor_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", sessao.vendedor_id)
        .single();
      targetEmail = profile?.email;
    }

    if (!targetEmail) throw new Error("Nenhum email de destino encontrado");

    // Send email via Gmail SMTP
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    await client.send({
      from: GMAIL_USER,
      to: targetEmail,
      subject: `Relatório de Visita Técnica - ${sessao.nome_cliente}`,
      content: "Veja o relatório em HTML.",
      html: html_content,
    });

    await client.close();

    // Update session status
    await supabase
      .from("orcamento_sessoes")
      .update({
        status: "relatorio_enviado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessao_id);

    return new Response(
      JSON.stringify({ success: true, email: targetEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-visit-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
