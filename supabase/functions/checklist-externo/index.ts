// Public edge function for external technicians to view/submit installation checklists via a shareable token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CHECKLIST_TITLES: Record<string, string> = {
  check_projeto: "Check de Projeto",
  laudo_visita_startup: "Laudo e Check-list de Visita de Implantação",
  laudo_instalador: "Laudo e Check-list do Instalador",
  laudo_vidraceiro: "Laudo e Check-list do Vidraceiro",
  laudo_serralheiro: "Laudo e Check-list do Serralheiro",
  laudo_conclusao: "Laudo e Check-list de Conclusão do Supervisor",
  check_programacao: "Check e Laudo de Programação",
  instalacao_totem: "Check-list de Instalação do Totem",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: checklist, error: cErr } = await supabase
      .from("implantacao_checklists")
      .select("id, tipo, dados, observacoes, project_id, external_submitted_at, external_submitted_by_name")
      .eq("public_token", token)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!checklist) {
      return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("cliente_condominio_nome, cliente_cidade, cliente_estado, numero_projeto")
      .eq("id", checklist.project_id)
      .maybeSingle();

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          tipo: checklist.tipo,
          title: CHECKLIST_TITLES[checklist.tipo] || "Checklist",
          dados: checklist.dados,
          observacoes: checklist.observacoes,
          project: project || null,
          submitted_at: checklist.external_submitted_at,
          submitted_by: checklist.external_submitted_by_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { items, observacoes, nome, telefone } = body;

      const { error: upErr } = await supabase
        .from("implantacao_checklists")
        .update({
          dados: { items },
          observacoes: observacoes || null,
          external_submitted_at: new Date().toISOString(),
          external_submitted_by_name: nome || null,
          external_submitted_by_phone: telefone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checklist.id);

      if (upErr) throw upErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("checklist-externo error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
