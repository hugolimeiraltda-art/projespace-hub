import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nocApiUrl = Deno.env.get("EIXONOC_API_URL");
    const nocApiKey = Deno.env.get("EIXONOC_API_KEY");

    if (!nocApiUrl) {
      return new Response(
        JSON.stringify({ error: "EIXONOC_API_URL não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    // Service client for full data access
    const supabase = createClient(supabaseUrl, serviceKey);

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check idempotency - existing chamado?
    const { data: existingChamado } = await supabase
      .from("implantacao_noc_chamados")
      .select("*")
      .eq("project_id", project_id)
      .eq("transicao_noc", "abertura_secao_6")
      .maybeSingle();

    if (existingChamado && existingChamado.integration_status === "success") {
      return new Response(
        JSON.stringify({
          status: "duplicate",
          chamado_id: existingChamado.chamado_id,
          chamado_numero: existingChamado.chamado_numero,
          chamado_url: existingChamado.chamado_url,
          opened_at: existingChamado.opened_at,
          opened_by_name: existingChamado.opened_by_name,
          message: "Chamado já existe para esta implantação",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", userId)
      .single();

    // Collect all data for payload

    // Section 2: Project/Client data
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    const { data: customerPortfolio } = await supabase
      .from("customer_portfolio")
      .select("*")
      .eq("project_id", project_id)
      .maybeSingle();

    const { data: administradores } = await supabase
      .from("customer_administradores")
      .select("*")
      .eq("customer_id", customerPortfolio?.id || "00000000-0000-0000-0000-000000000000");

    // Section 3: Implantacao etapas (boas vindas items)
    const { data: etapas } = await supabase
      .from("implantacao_etapas")
      .select("*")
      .eq("project_id", project_id)
      .single();

    // Section 4: Checklists, attachments, laudos
    const { data: checklists } = await supabase
      .from("implantacao_checklists")
      .select("*")
      .eq("project_id", project_id);

    const { data: attachments } = await supabase
      .from("sale_form_attachments")
      .select("*")
      .eq("project_id", project_id);

    const { data: projectAttachments } = await supabase
      .from("project_attachments")
      .select("*")
      .eq("project_id", project_id);

    // Section 5: Sale form data (obra execution)
    const { data: saleForm } = await supabase
      .from("sale_forms")
      .select("*")
      .eq("project_id", project_id)
      .maybeSingle();

    const { data: tapForm } = await supabase
      .from("tap_forms")
      .select("*")
      .eq("project_id", project_id)
      .maybeSingle();

    // EAP: orcamento sessions linked to this project
    const { data: orcamentoSessoes } = await supabase
      .from("orcamento_sessoes")
      .select("*")
      .eq("projeto_id", project_id);

    // Comments
    const { data: comments } = await supabase
      .from("project_comments")
      .select("*")
      .eq("project_id", project_id)
      .order("created_at", { ascending: true });

    // Build section 3 items status
    const secao3Itens = [];
    if (etapas) {
      const items = [
        { item: "3.1 - Ligação de Boas Vindas", status: etapas.ligacao_boas_vindas, date: etapas.ligacao_boas_vindas_at },
        { item: "3.2 - Cadastro Gear", status: etapas.cadastro_gear, date: etapas.cadastro_gear_at },
        { item: "3.3 - Síndico App", status: etapas.sindico_app, date: etapas.sindico_app_at },
        { item: "3.4 - Conferência Tags", status: etapas.conferencia_tags, date: etapas.conferencia_tags_at },
        { item: "4.1 - Check Projeto", status: etapas.check_projeto, date: etapas.check_projeto_at },
        { item: "4.2 - Visita Startup", status: etapas.agendamento_visita_startup, date: etapas.agendamento_visita_startup_at },
        { item: "4.3 - Laudo Visita Startup", status: etapas.laudo_visita_startup, date: etapas.laudo_visita_startup_at },
        { item: "5.1 - Laudo Instalador", status: etapas.laudo_instalador, date: etapas.laudo_instalador_at },
        { item: "5.2 - Laudo Vidraceiro", status: etapas.laudo_vidraceiro, date: etapas.laudo_vidraceiro_at },
        { item: "5.3 - Laudo Serralheiro", status: etapas.laudo_serralheiro, date: etapas.laudo_serralheiro_at },
        { item: "5.4 - Laudo Conclusão Supervisor", status: etapas.laudo_conclusao_supervisor, date: etapas.laudo_conclusao_supervisor_at },
      ];
      for (const i of items) {
        secao3Itens.push({
          item: i.item,
          status: i.status ? "concluido" : "pendente",
          data_conclusao: i.date || null,
        });
      }
    }

    // Build payload
    const payload = {
      implantacao_id: etapas?.id,
      project_id,
      transicao_noc: "abertura_secao_6",
      secao_atual: 6,
      tipo_implantacao: "padrao",
      prioridade: "normal",
      
      secao_2_cliente: {
        cliente_id: customerPortfolio?.id,
        razao_social: project?.cliente_condominio_nome || customerPortfolio?.razao_social,
        contrato: customerPortfolio?.contrato,
        endereco: customerPortfolio?.endereco,
        cidade: project?.cliente_cidade,
        estado: project?.cliente_estado,
        contato_nome: customerPortfolio?.contato_nome,
        contato_telefone: customerPortfolio?.contato_telefone,
        tipo: customerPortfolio?.tipo,
        filial: customerPortfolio?.filial,
        praca: customerPortfolio?.praca,
        empresa: customerPortfolio?.empresa,
        alarme_codigo: customerPortfolio?.alarme_codigo,
        mensalidade: customerPortfolio?.mensalidade,
        taxa_ativacao: customerPortfolio?.taxa_ativacao,
        unidades: customerPortfolio?.unidades,
        administradores: administradores || [],
      },

      secao_3_itens_feitos: secao3Itens,

      secao_4_laudos: {
        checklists: checklists || [],
        anexos_implantacao: (attachments || []).filter((a: any) =>
          a.secao?.startsWith("implantacao_")
        ),
        anexos_projeto: projectAttachments || [],
      },

      secao_5_informacoes: {
        sale_form: saleForm || null,
        tap_form: tapForm || null,
        equipamentos: {
          cameras: customerPortfolio?.cameras,
          dvr_nvr: customerPortfolio?.dvr_nvr,
          portoes: customerPortfolio?.portoes,
          portas: customerPortfolio?.portas,
          cancelas: customerPortfolio?.cancelas,
          catracas: customerPortfolio?.catracas,
          totem_simples: customerPortfolio?.totem_simples,
          totem_duplo: customerPortfolio?.totem_duplo,
          faciais_hik: customerPortfolio?.faciais_hik,
          faciais_avicam: customerPortfolio?.faciais_avicam,
          faciais_outros: customerPortfolio?.faciais_outros,
          zonas_perimetro: customerPortfolio?.zonas_perimetro,
          leitores: customerPortfolio?.leitores,
          quantidade_leitores: customerPortfolio?.quantidade_leitores,
        },
      },

      eap_completo: (orcamentoSessoes || []).map((s: any) => ({
        eap_id: s.id,
        nome: s.nome_cliente,
        status: s.status,
      })),

      acessos_funcionais: [
        {
          label: "Formulário",
          enabled: true,
          url: `https://eixopci.lovable.app/projetos/${project_id}/formulario-venda`,
          resource_type: "sale_form",
          permissions: ["view", "edit"],
        },
        {
          label: "Anexos",
          enabled: true,
          url: `https://eixopci.lovable.app/projetos/${project_id}`,
          resource_type: "attachments",
          permissions: ["view", "upload"],
        },
        {
          label: "Equipamentos",
          enabled: true,
          url: `https://eixopci.lovable.app/projetos/${project_id}`,
          resource_type: "equipment_list",
          permissions: ["view"],
        },
        {
          label: "Detalhes do Projeto",
          enabled: true,
          url: `https://eixopci.lovable.app/projetos/${project_id}`,
          resource_type: "project_detail",
          permissions: ["view"],
        },
      ],

      comentarios: comments || [],
    };

    // Call EIXONOC API
    let nocResponse: any;
    let integrationStatus = "error";
    let integrationMessage = "";
    let chamadoId = null;
    let chamadoNumero = null;
    let chamadoUrl = null;

    try {
      const nocRes = await fetch(nocApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(nocApiKey ? { "Authorization": `Bearer ${nocApiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      nocResponse = await nocRes.json();

      if (nocRes.ok) {
        integrationStatus = "success";
        integrationMessage = nocResponse.message || "Chamado criado com sucesso";
        chamadoId = nocResponse.chamado_id || nocResponse.id;
        chamadoNumero = nocResponse.chamado_numero || nocResponse.numero;
        chamadoUrl = nocResponse.chamado_url || nocResponse.url;
      } else {
        integrationStatus = "error";
        integrationMessage = nocResponse.error || nocResponse.message || `Erro ${nocRes.status}`;
      }
    } catch (fetchError: any) {
      integrationStatus = "error";
      integrationMessage = `Erro de conexão: ${fetchError.message}`;
      nocResponse = { error: fetchError.message };
    }

    const now = new Date().toISOString();

    // Upsert the chamado record
    const chamadoData = {
      project_id,
      implantacao_id: etapas?.id,
      transicao_noc: "abertura_secao_6",
      chamado_id: chamadoId,
      chamado_numero: chamadoNumero,
      chamado_url: chamadoUrl,
      integration_status: integrationStatus,
      integration_message: integrationMessage,
      opened_by: userId,
      opened_by_name: userProfile?.nome || "Usuário",
      opened_at: integrationStatus === "success" ? now : null,
      payload_snapshot: payload,
      response_snapshot: nocResponse,
      item_6_1_status: integrationStatus === "success" ? "success" : "error",
      item_6_2_status: integrationStatus === "success" ? "pending" : "blocked",
      item_6_3_status: "blocked",
    };

    if (existingChamado) {
      await supabase
        .from("implantacao_noc_chamados")
        .update(chamadoData)
        .eq("id", existingChamado.id);
    } else {
      await supabase.from("implantacao_noc_chamados").insert(chamadoData);
    }

    return new Response(
      JSON.stringify({
        status: integrationStatus,
        chamado_id: chamadoId,
        chamado_numero: chamadoNumero,
        chamado_url: chamadoUrl,
        opened_at: integrationStatus === "success" ? now : null,
        opened_by_name: userProfile?.nome,
        message: integrationMessage,
      }),
      {
        status: integrationStatus === "success" ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("noc-integration error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
