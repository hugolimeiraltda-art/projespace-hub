import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendGmailSMTP(from: string, to: string, subject: string, htmlBody: string, password: string) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });

  async function read(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    if (n === null) throw new Error("Connection closed");
    return decoder.decode(buf.subarray(0, n));
  }

  async function write(cmd: string) {
    await conn.write(encoder.encode(cmd + "\r\n"));
  }

  async function command(cmd: string, expectedCode: string): Promise<string> {
    await write(cmd);
    const resp = await read();
    if (!resp.startsWith(expectedCode)) {
      throw new Error(`SMTP error on "${cmd}": ${resp}`);
    }
    return resp;
  }

  // Read greeting
  const greeting = await read();
  if (!greeting.startsWith("220")) throw new Error("SMTP greeting failed: " + greeting);

  await command("EHLO localhost", "250");

  // AUTH LOGIN
  await command("AUTH LOGIN", "334");
  await command(btoa(from), "334");
  await command(btoa(password), "235");

  await command(`MAIL FROM:<${from}>`, "250");
  await command(`RCPT TO:<${to}>`, "250");
  await command("DATA", "354");

  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const message = [
    `From: Emive Visitas <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `Relatório de Visita Técnica`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
    ``,
    `.`,
  ].join("\r\n");

  await conn.write(encoder.encode(message));
  const dataResp = await read();
  if (!dataResp.startsWith("250")) throw new Error("DATA send failed: " + dataResp);

  await command("QUIT", "221");
  conn.close();
}

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
    await sendGmailSMTP(
      GMAIL_USER,
      targetEmail,
      `Relatório de Visita Técnica - ${sessao.nome_cliente}`,
      html_content,
      GMAIL_APP_PASSWORD
    );

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
