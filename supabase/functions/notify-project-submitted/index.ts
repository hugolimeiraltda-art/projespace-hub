import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function sendSMTP(from: string, to: string[], subject: string, htmlBody: string) {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");

  if (!host || !user || !password) {
    throw new Error("SMTP credentials not configured");
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
  const authPlain = btoa(`\0${user}\0${password}`);
  await tlsCommand(`AUTH PLAIN ${authPlain}`, "235");

  await tlsCommand(`MAIL FROM:<${user}>`, "250");
  for (const recipient of to) {
    await tlsCommand(`RCPT TO:<${recipient}>`, "250");
  }
  await tlsCommand("DATA", "354");

  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const message = [
    `From: Eixo PCI <${user}>`,
    `To: ${to.join(", ")}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `Notificação de projeto`,
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

interface NotifyProjectRequest {
  projectId?: string;
  project_id?: string;
  projectName?: string;
  project_name?: string;
  vendedorNome?: string;
  vendedor_name?: string;
  vendedorEmail?: string;
  cidade?: string;
  estado?: string;
  is_resubmission?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: NotifyProjectRequest = await req.json();
    const projectId = body.projectId || body.project_id || '';
    const projectName = body.projectName || body.project_name || '';
    const vendedorNome = body.vendedorNome || body.vendedor_name || '';
    const vendedorEmail = body.vendedorEmail || '';
    const { cidade, estado, is_resubmission } = body;

    console.log("notify-project-submitted:", projectId, is_resubmission ? "(resubmission)" : "");

    const { data: projetosRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "projetos");

    if (rolesError) {
      console.error("Error fetching projetos roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch project team" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projetosRoles || projetosRoles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No project team members to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = projetosRoles.map(r => r.user_id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("email, nome")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emails = profiles?.map(p => p.email).filter(Boolean) || [];
    console.log(`Found ${emails.length} projetos users to notify`);

    // Create notifications
    const notificationType = is_resubmission ? 'PROJECT_RESUBMITTED' : 'PROJECT_SUBMITTED';
    const notificationTitle = is_resubmission ? 'Projeto Reenviado' : 'Novo Projeto Enviado';
    const notificationMessage = is_resubmission 
      ? `O projeto "${projectName}" foi reenviado por ${vendedorNome} com informações adicionais`
      : `O projeto "${projectName}" foi enviado por ${vendedorNome}`;

    const notifications = userIds.map(userId => ({
      project_id: projectId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      for_user_id: userId,
      for_role: 'projetos',
    }));

    const { error: notifError } = await supabaseAdmin
      .from("project_notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    // Send emails via SMTP
    if (emails.length > 0) {
      try {
        const location = cidade && estado ? `${cidade} - ${estado}` : cidade || estado || 'Não informado';
        
        const emailSubject = is_resubmission 
          ? `Projeto Reenviado: ${projectName}`
          : `Novo Projeto Enviado: ${projectName}`;
        
        const emailTitle = is_resubmission 
          ? 'Projeto Reenviado com Informações Adicionais'
          : 'Novo Projeto Recebido';
        
        const emailIntro = is_resubmission
          ? 'Um projeto foi reenviado com informações adicionais e está aguardando nova análise:'
          : 'Um novo projeto foi enviado e está aguardando análise:';
        
        const safeProjectName = escapeHtml(projectName);
        const safeVendedorNome = escapeHtml(vendedorNome);
        const safeVendedorEmail = vendedorEmail ? escapeHtml(vendedorEmail) : '';
        const safeLocation = escapeHtml(location);
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1E40AF;">${escapeHtml(emailTitle)}</h1>
            <p>Olá,</p>
            <p>${escapeHtml(emailIntro)}</p>
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #374151; margin-top: 0;">${safeProjectName}</h2>
              <p><strong>Vendedor:</strong> ${safeVendedorNome}</p>
              ${safeVendedorEmail ? `<p><strong>Email:</strong> ${safeVendedorEmail}</p>` : ''}
              <p><strong>Localização:</strong> ${safeLocation}</p>
            </div>
            <p>Acesse o sistema para visualizar os detalhes e ${is_resubmission ? 'continuar' : 'iniciar'} a análise.</p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
              Este é um email automático enviado pelo sistema Eixo PCI.
            </p>
          </div>
        `;

        await sendSMTP(
          Deno.env.get("SMTP_USER") || "",
          emails,
          emailSubject,
          htmlContent
        );

        console.log("Emails sent successfully via SMTP");
      } catch (emailError) {
        console.error("Error sending emails:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifiedCount: emails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-project-submitted:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
