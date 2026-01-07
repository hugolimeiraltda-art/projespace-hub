import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusEmailRequest {
  vendedor_email: string;
  vendedor_nome: string;
  projeto_nome: string;
  projeto_id: string;
  old_status: string;
  new_status: string;
  new_status_label: string;
  changed_by: string;
  comment?: string; // Comentário obrigatório para PENDENTE_INFO
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-status-email function called");
  
  // Handle CORS preflight requests
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
          <!-- Header -->
          <div style="background-color: #1e40af; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Atualização de Projeto</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              Olá <strong>${vendedor_nome}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              O projeto <strong>"${projeto_nome}"</strong> teve seu status alterado:
            </p>
            
            <!-- Status Badge -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ${new_status_label}
              </div>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
              Alterado por: ${changed_by}
            </p>
    `;

    // Se for PENDENTE_INFO e tiver comentário, adicionar ao email
    if (isPendingInfo && comment) {
      emailHtml += `
            <!-- Pending Info Alert -->
            <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #92400E; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">
                ⚠️ Informações Pendentes:
              </p>
              <p style="color: #78350F; margin: 0; font-size: 14px; white-space: pre-wrap;">
                ${comment}
              </p>
            </div>
            
            <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
              Por favor, acesse o sistema para fornecer as informações solicitadas.
            </p>
      `;
    }

    emailHtml += `
            <!-- CTA Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://app.lovable.dev'}/projetos/${projeto_id}" 
                 style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Ver Projeto
              </a>
            </div>
          </div>
          
          <!-- Footer -->
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
      ? `⚠️ Ação Necessária: Projeto "${projeto_nome}" requer informações`
      : `Atualização: Projeto "${projeto_nome}" - ${new_status_label}`;

    const emailResponse = await resend.emails.send({
      from: "Projetos <onboarding@resend.dev>",
      to: [vendedor_email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-status-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
