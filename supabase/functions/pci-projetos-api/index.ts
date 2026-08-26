import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ATTACHMENT_TYPES = [
  "PLANTA_CROQUI_DEVOLUCAO",
  "LISTA_EQUIPAMENTOS",
  "LISTA_ATIVIDADES",
  "CROQUI",
  "PLANTA_BAIXA",
];

function storagePathFromUrl(url: string): { bucket: string; path: string } | null {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return null;
  const m =
    url.match(/\/storage\/v1\/object\/sign\/([^?]+)/) ||
    url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (!m) return null;
  const full = decodeURIComponent(m[1]);
  const parts = full.split("/");
  return { bucket: parts[0], path: parts.slice(1).join("/") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accepted = [
      Deno.env.get("EIXO_PCI_API_KEY_V3"),
      Deno.env.get("EIXO_PCI_API_KEY_V2"),
    ].filter(Boolean) as string[];
    const provided =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!provided || !accepted.includes(provided)) {
      return json({ error: "Unauthorized" }, 401);
    }


    const url = new URL(req.url);
    const contrato = url.searchParams.get("contrato");
    const projectId = url.searchParams.get("project_id");
    const updatedSince = url.searchParams.get("updated_since");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100) || 100, 500);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0) || 0, 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Resolve which projects to return (PCI only) ---
    let projectIds: string[] | null = null;

    let portfolioQuery = supabase
      .from("customer_portfolio")
      .select(
        "id, contrato, razao_social, filial, empresa, unidades, mensalidade, data_ativacao, data_termino, endereco, contato_nome, contato_telefone, status_implantacao, telefonia_funcionamento, project_id, updated_at, tipo_carteira"
      )
      .eq("tipo_carteira", "PCI")
      .not("contrato", "like", "TEMP-%");

    if (contrato) portfolioQuery = portfolioQuery.eq("contrato", contrato);
    if (projectId) portfolioQuery = portfolioQuery.eq("project_id", projectId);
    if (updatedSince) portfolioQuery = portfolioQuery.gte("updated_at", updatedSince);

    const { data: portfolio, error: pErr } = await portfolioQuery
      .order("contrato", { ascending: true })
      .range(offset, offset + limit - 1);
    if (pErr) throw pErr;

    projectIds = (portfolio || [])
      .map((c: any) => c.project_id)
      .filter((v: string | null): v is string => !!v);

    // --- Projects ---
    const { data: projects } = projectIds.length
      ? await supabase
          .from("projects")
          .select(
            "id, cliente_condominio_nome, cliente_cidade, cliente_estado, endereco_condominio, vendedor_nome, status, engineering_status, engineering_completed_at, tipo_implantacao, sale_status, laudo_projeto, created_at, updated_at"
          )
          .in("id", projectIds)
      : { data: [] as any[] };

    // --- TAP forms ---
    const { data: taps } = projectIds.length
      ? await supabase.from("tap_forms").select("*").in("project_id", projectIds)
      : { data: [] as any[] };

    // --- Sale forms (Venda) ---
    const { data: sales } = projectIds.length
      ? await supabase.from("sale_forms").select("*").in("project_id", projectIds)
      : { data: [] as any[] };


    // --- Engineering attachments ---
    const { data: attachments } = projectIds.length
      ? await supabase
          .from("project_attachments")
          .select("project_id, tipo, arquivo_url, nome_arquivo, created_at")
          .in("project_id", projectIds)
          .in("tipo", ATTACHMENT_TYPES)
      : { data: [] as any[] };

    // Signed URLs (valid 7 days) so the consumer can download the files
    const signed = new Map<string, string>();
    for (const att of attachments || []) {
      const loc = storagePathFromUrl(att.arquivo_url || "");
      if (!loc) continue;
      const { data: s } = await supabase.storage
        .from(loc.bucket)
        .createSignedUrl(loc.path, 60 * 60 * 24 * 7);
      if (s?.signedUrl) signed.set(att.arquivo_url, s.signedUrl);
    }

    const projById = new Map((projects || []).map((p: any) => [p.id, p]));
    const tapByProj = new Map((taps || []).map((t: any) => [t.project_id, t]));
    const saleByProj = new Map((sales || []).map((s: any) => [s.project_id, s]));

    const items = (portfolio || []).map((c: any) => {
      const proj = c.project_id ? projById.get(c.project_id) : null;
      const tap = c.project_id ? tapByProj.get(c.project_id) : null;
      const sale = c.project_id ? saleByProj.get(c.project_id) : null;

      const anexos = (attachments || [])
        .filter((a: any) => a.project_id === c.project_id)
        .map((a: any) => ({
          tipo: a.tipo,
          nome_arquivo: a.nome_arquivo,
          url: signed.get(a.arquivo_url) || a.arquivo_url,
          created_at: a.created_at,
        }));

      return {
        contrato: c.contrato,
        condominio: c.razao_social,
        filial: c.filial,
        empresa: c.empresa,
        unidades: c.unidades,
        mensalidade: c.mensalidade,
        data_ativacao: c.data_ativacao,
        data_termino: c.data_termino,
        endereco: c.endereco ?? proj?.endereco_condominio ?? null,
        contato: { nome: c.contato_nome, telefone: c.contato_telefone },
        telefonia_funcionamento: c.telefonia_funcionamento,
        status_implantacao: c.status_implantacao,
        project_id: c.project_id,
        projeto: proj
          ? {
              cidade: proj.cliente_cidade,
              estado: proj.cliente_estado,
              vendedor: proj.vendedor_nome,
              status: proj.status,
              engenharia_status: proj.engineering_status,
              engenharia_concluida_em: proj.engineering_completed_at,
              laudo_projeto: proj.laudo_projeto ?? null,
            }
          : null,
        tap: tap
          ? {
              numero_unidades: tap.numero_unidades,
              numero_blocos: tap.numero_blocos,
              modalidade_portaria: tap.modalidade_portaria,
              portaria_virtual_atendimento_app: tap.portaria_virtual_atendimento_app,
              interfonia: tap.interfonia,
              interfonia_tipo: tap.interfonia_tipo,
              interfonia_descricao: tap.interfonia_descricao,
              interfonia_alternativa: tap.interfonia_alternativa,
              controle_acessos_pedestre_descricao: tap.controle_acessos_pedestre_descricao,
              controle_acessos_veiculo_descricao: tap.controle_acessos_veiculo_descricao,
              alarme_descricao: tap.alarme_descricao,
              cftv_dvr_descricao: tap.cftv_dvr_descricao,
              cftv_elevador_possui: tap.cftv_elevador_possui,
              observacao_nao_assumir_cameras: tap.observacao_nao_assumir_cameras,
              marcacao_croqui_confirmada: tap.marcacao_croqui_confirmada,
              marcacao_croqui_itens: tap.marcacao_croqui_itens,
              info_custo: tap.info_custo,
              info_cronograma: tap.info_cronograma,
              info_adicionais: tap.info_adicionais,
              solicitacao_origem: tap.solicitacao_origem,
            }
          : null,
        // Objeto TAP completo (todos os campos do formulário)
        tap_completo: tap ?? null,
        // Formulário de Venda completo (seção "Resumo do Projeto (TAP + Venda)")
        venda: sale ?? null,
        // Seção "Devolução do Projeto (Engenharia)"
        devolucao_engenharia: {
          laudo_projeto: proj?.laudo_projeto ?? null,
          engenharia_status: proj?.engineering_status ?? null,
          engenharia_concluida_em: proj?.engineering_completed_at ?? null,
          planta_croqui: anexos.filter((a: any) =>
            ["PLANTA_CROQUI_DEVOLUCAO", "PLANTA_BAIXA", "CROQUI"].includes(a.tipo)
          ),
          lista_equipamentos: anexos.filter((a: any) => a.tipo === "LISTA_EQUIPAMENTOS"),
          lista_atividades: anexos.filter((a: any) => a.tipo === "LISTA_ATIVIDADES"),
        },
        anexos_engenharia: anexos,
        updated_at: c.updated_at,

      };
    });

    return json({
      generated_at: new Date().toISOString(),
      count: items.length,
      limit,
      offset,
      next_offset: items.length === limit ? offset + limit : null,
      items,
    });
  } catch (e: any) {
    console.error("pci-projetos-api error:", e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});
