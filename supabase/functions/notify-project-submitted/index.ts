import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyProjectRequest {
  projectId: string;
  projectName: string;
  vendedorNome: string;
  vendedorEmail: string;
  cidade?: string;
  estado?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated
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
    const { projectId, projectName, vendedorNome, vendedorEmail, cidade, estado } = body;

    console.log("notify-project-submitted: Notifying about project", projectId);

    // Get all users with 'projetos' role
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
      console.log("No users with 'projetos' role found");
      return new Response(
        JSON.stringify({ success: true, message: "No project team members to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get emails of all projetos users
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

    // Create notifications for each projetos user
    const notifications = userIds.map(userId => ({
      project_id: projectId,
      type: 'PROJECT_SUBMITTED',
      title: 'Novo Projeto Enviado',
      message: `O projeto "${projectName}" foi enviado por ${vendedorNome}`,
      for_user_id: userId,
      for_role: 'projetos',
    }));

    const { error: notifError } = await supabaseAdmin
      .from("project_notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    // Send emails if Resend is configured
    if (resendApiKey && emails.length > 0) {
      try {
        const resend = new Resend(resendApiKey);
        
        const location = cidade && estado ? `${cidade} - ${estado}` : cidade || estado || 'Não informado';
        
        const emailResponse = await resend.emails.send({
          from: "Projetos PCI <onboarding@resend.dev>",
          to: emails,
          subject: `Novo Projeto Enviado: ${projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1E40AF;">Novo Projeto Recebido</h1>
              <p>Olá,</p>
              <p>Um novo projeto foi enviado e está aguardando análise:</p>
              
              <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #374151; margin-top: 0;">${projectName}</h2>
                <p><strong>Vendedor:</strong> ${vendedorNome}</p>
                <p><strong>Email:</strong> ${vendedorEmail}</p>
                <p><strong>Localização:</strong> ${location}</p>
              </div>
              
              <p>Acesse o sistema para visualizar os detalhes e iniciar a análise.</p>
              
              <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
                Este é um email automático enviado pelo sistema Projetos PCI.
              </p>
            </div>
          `,
        });

        console.log("Emails sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Error sending emails:", emailError);
        // Don't fail the request if email fails, notifications were still created
      }
    } else {
      console.log("Resend not configured or no emails to send");
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
