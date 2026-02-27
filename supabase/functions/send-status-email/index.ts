import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// HTML sanitization to prevent injection attacks
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

interface StatusEmailRequest {
  vendedor_email: string;
  vendedor_nome: string;
  projeto_nome: string;
  projeto_id: string;
  old_status: string;
  new_status: string;
  new_status_label: string;
  changed_by: string;
  comment?: string;
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em Análise',
  PENDENTE_INFO: 'Pendente Info',
  APROVADO_PROJETO: 'Aprovado',
  CANCELADO: 'Cancelado',
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    RASCUNHO: '#6B7280',
    ENVIADO: '#3B82F6',
    EM_ANALISE: '#8B5CF6',
    PENDENTE_INFO: '#F59E0B',
    APROVADO_PROJETO: '#10B981',
    CANCELADO: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

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

  const greeting = await read();
  if (!greeting.startsWith("220")) throw new Error("SMTP greeting failed: " + greeting);

  await command("EHLO localhost", "250");
  await command("STARTTLS", "220");

  const tlsConn = await Deno.startTls(conn, { hostname: host });

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

  await tlsCommand("EHLO localhost", "250");
  // Use AUTH PLAIN: \0user\0password base64-encoded
  const authPlain = btoa(`\0${user}\0${password}`);
  await tlsCommand(`AUTH PLAIN ${authPlain}`, "235");

  await tlsCommand(`MAIL FROM:<${user}>`, "250");
  await tlsCommand(`RCPT TO:<${to}>`, "250");
  await tlsCommand("DATA", "354");

  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const message = [
    `From: Eixo PCI <${user}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `Atualização de projeto`,
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-status-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      vendedor_email, 
      vendedor_nome, 
      projeto_nome, 
      projeto_id,
      old_status,
      new_status,
      new_status_label,
      changed_by,
      comment
    }: StatusEmailRequest = await req.json();

    console.log(`Sending status change email to ${vendedor_email} for project ${projeto_nome}`);
    console.log(`Status changed from ${old_status} to ${new_status}`);

    const statusColor = getStatusColor(new_status);
    const isPendingInfo = new_status === 'PENDENTE_INFO';

    let emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #1e40af; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Atualização de Projeto</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Olá <strong>${escapeHtml(vendedor_nome)}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              O projeto <strong>"${escapeHtml(projeto_nome)}"</strong> teve seu status alterado:
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ${escapeHtml(new_status_label)}
              </div>
            </div>
            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
              Alterado por: ${escapeHtml(changed_by)}
            </p>
    `;

    if (isPendingInfo && comment) {
      emailHtml += `
            <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400E; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">
                ⚠️ Informações Pendentes:
              </p>
              <p style="color: #78350F; margin: 0; font-size: 14px; white-space: pre-wrap;">
                ${escapeHtml(comment)}
              </p>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
              Por favor, acesse o sistema para fornecer as informações solicitadas.
            </p>
      `;
    }

    emailHtml += `
            <div style="text-align: center; margin-top: 32px;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://eixopci.lovable.app'}/projetos/${projeto_id}" 
                 style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Ver Projeto
              </a>
            </div>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              Este é um email automático do Sistema de Gestão de Projetos.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = isPendingInfo 
      ? `⚠️ Ação Necessária: Projeto "${escapeHtml(projeto_nome)}" requer informações`
      : `Atualização: Projeto "${escapeHtml(projeto_nome)}" - ${escapeHtml(new_status_label)}`;

    const smtpUser = Deno.env.get("SMTP_USER") || "";
    await sendSMTP(smtpUser, vendedor_email, subject, emailHtml);

    console.log("Email sent successfully via SMTP");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-status-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
