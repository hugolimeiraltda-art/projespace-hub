import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  projectId: z.string().uuid(),
  contrato: z.string().trim().min(1).max(100),
  alarme_codigo: z.string().trim().max(100).nullable().optional(),
  mensalidade: z.number().nullable(),
  taxa_ativacao: z.number().nullable(),
  data_termino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filial: z.string().trim().max(50).nullable().optional(),
  razao_social: z.string().trim().max(255).nullable().optional(),
  endereco: z.string().trim().max(255).nullable().optional(),
  status_implantacao: z.string().trim().max(50).nullable().optional(),
});

type CustomerRow = {
  id: string;
  project_id: string | null;
  contrato: string;
  razao_social: string;
  endereco: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || !["admin", "projetos", "implantacao"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Você não tem permissão para salvar contratos." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedBody = requestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: "Dados inválidos para salvar o contrato." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = parsedBody.data;
    const normalizedPayload = {
      contrato: body.contrato,
      alarme_codigo: body.alarme_codigo?.trim() ? body.alarme_codigo.trim() : null,
      mensalidade: body.mensalidade,
      taxa_ativacao: body.taxa_ativacao,
      data_termino: body.data_termino,
      filial: body.filial?.trim() ? body.filial.trim() : null,
      project_id: body.projectId,
      status_implantacao: body.status_implantacao?.trim() ? body.status_implantacao.trim() : "EM_IMPLANTACAO",
      razao_social: body.razao_social?.trim() ? body.razao_social.trim() : undefined,
      endereco: body.endereco?.trim() ? body.endereco.trim() : undefined,
    };

    const { data: matches, error: fetchError } = await supabaseAdmin
      .from("customer_portfolio")
      .select("id, project_id, contrato, razao_social, endereco")
      .or(`project_id.eq.${body.projectId},contrato.eq.${body.contrato}`)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    const rows = (matches ?? []) as CustomerRow[];
    const projectRow = rows.find((row) => row.project_id === body.projectId) ?? null;
    const contractRow = rows.find((row) => row.contrato === body.contrato) ?? null;

    if (projectRow && contractRow && projectRow.id !== contractRow.id) {
      const { error: updateError } = await supabaseAdmin
        .from("customer_portfolio")
        .update({
          ...normalizedPayload,
          razao_social: normalizedPayload.razao_social ?? projectRow.razao_social ?? contractRow.razao_social,
          endereco: normalizedPayload.endereco ?? projectRow.endereco ?? contractRow.endereco,
        })
        .eq("id", contractRow.id);

      if (updateError) {
        throw updateError;
      }

      const { error: deleteError } = await supabaseAdmin
        .from("customer_portfolio")
        .delete()
        .eq("id", projectRow.id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(JSON.stringify({ success: true, merged: true, customer_id: contractRow.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contractRow) {
      const { error: updateError } = await supabaseAdmin
        .from("customer_portfolio")
        .update({
          ...normalizedPayload,
          razao_social: normalizedPayload.razao_social ?? contractRow.razao_social,
          endereco: normalizedPayload.endereco ?? contractRow.endereco,
        })
        .eq("id", contractRow.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true, merged: false, customer_id: contractRow.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (projectRow) {
      const { error: updateError } = await supabaseAdmin
        .from("customer_portfolio")
        .update({
          ...normalizedPayload,
          razao_social: normalizedPayload.razao_social ?? projectRow.razao_social,
          endereco: normalizedPayload.endereco ?? projectRow.endereco,
        })
        .eq("id", projectRow.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true, merged: false, customer_id: projectRow.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload = {
      ...normalizedPayload,
      razao_social: normalizedPayload.razao_social ?? "",
      endereco: normalizedPayload.endereco ?? null,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("customer_portfolio")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, merged: false, customer_id: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o contrato.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
