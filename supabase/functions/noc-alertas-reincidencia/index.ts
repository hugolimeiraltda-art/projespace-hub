import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via EIXONOC API key
    const nocApiKey = Deno.env.get("EIXONOC_API_KEY");
    const providedKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!nocApiKey || providedKey !== nocApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      // List alerts (with optional filters)
      const url = new URL(req.url);
      const contrato = url.searchParams.get("contrato");
      const resolvido = url.searchParams.get("resolvido");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("noc_alertas_reincidencia")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (contrato) query = query.eq("contrato", contrato);
      if (resolvido !== null && resolvido !== undefined) {
        query = query.eq("resolvido", resolvido === "true");
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ alertas: data, total: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Support single or batch alerts
      const alertas = Array.isArray(body.alertas) ? body.alertas : [body];

      const insertResults = [];
      const errors = [];

      for (const alerta of alertas) {
        if (!alerta.contrato || !alerta.razao_social) {
          errors.push({
            contrato: alerta.contrato,
            error: "contrato e razao_social são obrigatórios",
          });
          continue;
        }

        // Try to find customer_id by contrato
        let customerId = alerta.customer_id || null;
        if (!customerId && alerta.contrato) {
          const { data: customer } = await supabase
            .from("customer_portfolio")
            .select("id")
            .eq("contrato", alerta.contrato)
            .maybeSingle();
          if (customer) customerId = customer.id;
        }

        const record = {
          contrato: alerta.contrato,
          razao_social: alerta.razao_social,
          customer_id: customerId,
          tipo_alerta: alerta.tipo_alerta || "reincidencia",
          categoria: alerta.categoria || null,
          descricao: alerta.descricao || null,
          severidade: alerta.severidade || "media",
          quantidade_ocorrencias: alerta.quantidade_ocorrencias || 1,
          periodo_referencia: alerta.periodo_referencia || null,
          dados_extras: alerta.dados_extras || {},
        };

        const { data, error } = await supabase
          .from("noc_alertas_reincidencia")
          .insert(record)
          .select()
          .single();

        if (error) {
          errors.push({ contrato: alerta.contrato, error: error.message });
        } else {
          insertResults.push(data);
        }
      }

      return new Response(
        JSON.stringify({
          status: errors.length === 0 ? "success" : "partial",
          inseridos: insertResults.length,
          erros: errors.length,
          alertas: insertResults,
          detalhes_erros: errors.length > 0 ? errors : undefined,
        }),
        {
          status: errors.length === alertas.length ? 400 : 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não suportado. Use GET ou POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("noc-alertas-reincidencia error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
