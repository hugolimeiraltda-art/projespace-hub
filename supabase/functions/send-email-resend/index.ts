import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Eixo PCI <noreply@eixopci.com.br>";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function buildBaseHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background-color: #1e40af; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Eixo PCI</h1>
    </div>
    <div style="padding: 32px;">
      ${bodyContent}
    </div>
    <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">E-mail automático do Sistema Eixo PCI</p>
    </div>
  </div>
</body>
</html>`;
}

const TEMPLATES: Record<string, (vars: Record<string, string>) => { subject: string; html: string }> = {
  recuperacao_senha: (v) => ({
    subject: 'Redefinição de Senha - Eixo PCI',
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${v.link_redefinicao || '#'}" style="display:inline-block;background-color:#1e40af;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Redefinir Senha</a>
      </div>
      <p style="color:#6B7280;font-size:14px;">Este link expira em ${escapeHtml(v.validade || '24 horas')}.</p>
      <p style="color:#6B7280;font-size:14px;">Se você não solicitou esta alteração, ignore este e-mail.</p>
    `),
  }),
  boas_vindas: (v) => ({
    subject: 'Bem-vindo ao Eixo PCI - Seus dados de acesso',
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">Sua conta foi criada no sistema Eixo PCI. Abaixo estão seus dados de acesso:</p>
      <div style="background-color:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>E-mail:</strong> ${escapeHtml(v.email || '')}</p>
        <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Senha temporária:</strong> ${escapeHtml(v.senha_temporaria || '')}</p>
      </div>
      <p style="color:#374151;font-size:14px;">Ao acessar pela primeira vez, você será solicitado a alterar sua senha.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${v.link_login || '#'}" style="display:inline-block;background-color:#1e40af;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Acessar o Sistema</a>
      </div>
    `),
  }),
  status_projeto: (v) => ({
    subject: `Atualização: Projeto "${escapeHtml(v.projeto_nome || '')}" - ${escapeHtml(v.novo_status || '')}`,
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">O projeto <strong>"${escapeHtml(v.projeto_nome || '')}"</strong> teve seu status alterado:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background-color:${v.status_color || '#1e40af'};color:white;padding:12px 24px;border-radius:8px;font-size:18px;font-weight:bold;">${escapeHtml(v.novo_status || '')}</span>
      </div>
      <p style="color:#6B7280;font-size:14px;text-align:center;">Alterado por: ${escapeHtml(v.alterado_por || '')}</p>
      ${v.comentario ? `<div style="background-color:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#92400E;font-weight:bold;margin:0 0 8px;font-size:14px;">⚠️ Informações Pendentes:</p>
        <p style="color:#78350F;margin:0;font-size:14px;">${escapeHtml(v.comentario)}</p>
      </div>` : ''}
      <div style="text-align:center;margin:24px 0;">
        <a href="${v.link_projeto || '#'}" style="display:inline-block;background-color:#1e40af;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Ver Projeto</a>
      </div>
    `),
  }),
  relatorio_visita: (v) => ({
    subject: `Relatório de Visita Técnica - ${escapeHtml(v.cliente || '')}`,
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">O relatório de visita técnica do cliente <strong>${escapeHtml(v.cliente || '')}</strong> foi gerado.</p>
      ${v.conteudo_relatorio || ''}
    `),
  }),
  chamado_manutencao: (v) => ({
    subject: `Chamado de Manutenção - ${escapeHtml(v.cliente || '')} - ${escapeHtml(v.status || '')}`,
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">Um chamado de manutenção foi atualizado:</p>
      <div style="background-color:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Cliente:</strong> ${escapeHtml(v.cliente || '')}</p>
        <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Tipo:</strong> ${escapeHtml(v.tipo_chamado || '')}</p>
        <p style="margin:4px 0;color:#374151;font-size:14px;"><strong>Status:</strong> ${escapeHtml(v.status || '')}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${v.link_chamado || '#'}" style="display:inline-block;background-color:#1e40af;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Ver Chamado</a>
      </div>
    `),
  }),
  preventiva_agendada: (v) => ({
    subject: `Lembrete: Preventiva agendada para ${escapeHtml(v.data || '')} - ${escapeHtml(v.cliente || '')}`,
    html: buildBaseHtml(`
      <p style="color:#374151;font-size:16px;">Olá <strong>${escapeHtml(v.nome || 'Usuário')}</strong>,</p>
      <p style="color:#374151;font-size:16px;">A manutenção preventiva do cliente <strong>${escapeHtml(v.cliente || '')}</strong> está agendada para <strong>${escapeHtml(v.data || '')}</strong>.</p>
      <p style="color:#374151;font-size:14px;">${escapeHtml(v.descricao || '')}</p>
    `),
  }),
};

async function sendViaResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Resend API error: ${res.status}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Check config action
    if (action === "check_config") {
      return new Response(
        JSON.stringify({ configured: !!RESEND_API_KEY }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send test action
    if (action === "send_test") {
      const { template_id, to } = body;
      const templateFn = TEMPLATES[template_id];
      if (!templateFn) throw new Error(`Template "${template_id}" não encontrado`);

      const testVars: Record<string, string> = {
        nome: "Usuário Teste",
        email: to,
        senha_temporaria: "Teste@123",
        link_login: "https://eixopci.lovable.app/login",
        link_redefinicao: "https://eixopci.lovable.app/login",
        validade: "24 horas",
        projeto_nome: "Condomínio Exemplo",
        status_anterior: "Em Análise",
        novo_status: "Aprovado",
        status_color: "#10B981",
        alterado_por: "Admin Teste",
        link_projeto: "https://eixopci.lovable.app/projetos/teste",
        cliente: "Condomínio Exemplo",
        conteudo_relatorio: "<p>Conteúdo do relatório de teste.</p>",
        tipo_chamado: "Corretiva",
        status: "Aberto",
        link_chamado: "#",
        data: new Date().toLocaleDateString("pt-BR"),
        descricao: "Manutenção preventiva de teste",
      };

      const { subject, html } = templateFn(testVars);
      const result = await sendViaResend(to, `[TESTE] ${subject}`, html);
      return new Response(
        JSON.stringify({ success: true, id: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email action (used by other edge functions)
    if (action === "send") {
      const { template_id, to, variables } = body;
      const templateFn = TEMPLATES[template_id];
      
      if (templateFn) {
        const { subject, html } = templateFn(variables || {});
        const customSubject = body.subject || subject;
        const result = await sendViaResend(to, customSubject, html);
        return new Response(
          JSON.stringify({ success: true, id: result.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: send raw HTML
      if (body.html && body.subject) {
        const result = await sendViaResend(to, body.subject, body.html);
        return new Response(
          JSON.stringify({ success: true, id: result.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Template ou HTML não fornecido");
    }

    throw new Error(`Ação "${action}" não reconhecida`);
  } catch (e) {
    console.error("send-email-resend error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
