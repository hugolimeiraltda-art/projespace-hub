import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendSMTP(from: string, to: string, subject: string, htmlBody: string) {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");

  if (!host || !user || !password) {
    throw new Error("SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Port 587 uses STARTTLS (connect plain, then upgrade)
  const conn = await Deno.connect({ hostname: host, port });

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

  // STARTTLS for port 587
  await command("STARTTLS", "220");

  // Upgrade to TLS
  const tlsConn = await Deno.startTls(conn, { hostname: host });

  // Redefine read/write for TLS connection
  async function tlsRead(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await tlsConn.read(buf);
    if (n === null) throw new Error("TLS Connection closed");
    return decoder.decode(buf.subarray(0, n));
  }

  async function tlsWrite(cmd: string) {
    await tlsConn.write(encoder.encode(cmd + "\r\n"));
  }

  async function tlsCommand(cmd: string, expectedCode: string): Promise<string> {
    await tlsWrite(cmd);
    const resp = await tlsRead();
    if (!resp.startsWith(expectedCode)) {
      throw new Error(`SMTP TLS error on "${cmd}": ${resp}`);
    }
    return resp;
  }

  // Re-EHLO after TLS
  await tlsCommand("EHLO localhost", "250");

  // AUTH LOGIN
  await tlsCommand("AUTH LOGIN", "334");
  await tlsCommand(btoa(user), "334");
  await tlsCommand(btoa(password), "235");

  await tlsCommand(`MAIL FROM:<${user}>`, "250");
  await tlsCommand(`RCPT TO:<${to}>`, "250");
  await tlsCommand("DATA", "354");

  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const message = [
    `From: Emive Visitas <${user}>`,
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

  await tlsConn.write(encoder.encode(message));
  const dataResp = await tlsRead();
  if (!dataResp.startsWith("250")) throw new Error("DATA send failed: " + dataResp);

  await tlsCommand("QUIT", "221");
  tlsConn.close();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessao_id, email_destino, html_content } = await req.json();
    if (!sessao_id) throw new Error("sessao_id is required");

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

    // Send email via corporate SMTP
    await sendSMTP(
      Deno.env.get("SMTP_USER") || "",
      targetEmail,
      `Relatório de Visita Técnica - ${sessao.nome_cliente}`,
      html_content
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
