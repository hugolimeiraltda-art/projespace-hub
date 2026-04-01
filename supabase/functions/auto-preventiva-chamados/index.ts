import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active agendas where proxima_execucao is within the next 3 days
    // and no chamado has already been created for that date
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const todayStr = today.toISOString().split("T")[0];
    const limitStr = threeDaysFromNow.toISOString().split("T")[0];

    const { data: agendas, error: agendasError } = await supabase
      .from("manutencao_agendas_preventivas")
      .select("*")
      .eq("ativo", true)
      .gte("proxima_execucao", todayStr)
      .lte("proxima_execucao", limitStr);

    if (agendasError) throw agendasError;

    let created = 0;
    let skipped = 0;

    for (const agenda of agendas || []) {
      // Check if a chamado already exists for this agenda's customer + date
      const { data: existing } = await supabase
        .from("manutencao_chamados")
        .select("id")
        .eq("customer_id", agenda.customer_id)
        .eq("tipo", "PREVENTIVO")
        .eq("data_agendada", agenda.proxima_execucao)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Create chamado
      const { error: chamadoError } = await supabase
        .from("manutencao_chamados")
        .insert({
          customer_id: agenda.customer_id,
          contrato: agenda.contrato,
          razao_social: agenda.razao_social,
          tipo: "PREVENTIVO",
          descricao: agenda.descricao || "Manutenção Preventiva",
          equipamentos: agenda.equipamentos,
          tecnico_responsavel: agenda.tecnico_responsavel,
          data_agendada: agenda.proxima_execucao,
          praca: agenda.praca,
          historico: [
            {
              data: new Date().toISOString(),
              acao: "Chamado preventivo gerado automaticamente (3 dias antes)",
              usuario: "Sistema",
            },
          ],
        });

      if (chamadoError) {
        console.error(
          `Error creating chamado for agenda ${agenda.id}:`,
          chamadoError
        );
        continue;
      }

      // Calculate next execution date
      const proximaData = new Date(agenda.proxima_execucao + "T00:00:00");
      let novaProximaExecucao: Date;

      switch (agenda.frequencia) {
        case "SEMANAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setDate(novaProximaExecucao.getDate() + 7);
          break;
        case "QUINZENAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setDate(novaProximaExecucao.getDate() + 14);
          break;
        case "MENSAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 1);
          break;
        case "BIMESTRAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 2);
          break;
        case "TRIMESTRAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 3);
          break;
        case "QUADRIMESTRAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 4);
          break;
        case "SEMESTRAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 6);
          break;
        case "ANUAL":
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setFullYear(
            novaProximaExecucao.getFullYear() + 1
          );
          break;
        default:
          novaProximaExecucao = new Date(proximaData);
          novaProximaExecucao.setMonth(novaProximaExecucao.getMonth() + 1);
      }

      const novaData = novaProximaExecucao.toISOString().split("T")[0];

      await supabase
        .from("manutencao_agendas_preventivas")
        .update({
          ultima_execucao: agenda.proxima_execucao,
          proxima_execucao: novaData,
        })
        .eq("id", agenda.id);

      created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processado: ${created} chamados criados, ${skipped} já existiam`,
        created,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-preventiva-chamados:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
