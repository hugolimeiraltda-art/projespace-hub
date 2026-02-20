import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchContextData(supabase: any) {
  const [{ data: projects }, { data: portfolio }, { data: produtos }, { data: kits }] = await Promise.all([
    supabase.from("projects").select(`
      cliente_condominio_nome, cliente_cidade, cliente_estado, numero_unidades,
      sale_forms (
        qtd_apartamentos, qtd_blocos, qtd_portas_pedestre, qtd_portas_bloco,
        qtd_portoes_deslizantes, qtd_portoes_pivotantes, qtd_portoes_basculantes,
        cftv_novo_qtd_total_cameras, cftv_novo_qtd_dvr_4ch, cftv_novo_qtd_dvr_8ch, cftv_novo_qtd_dvr_16ch,
        possui_cancela, possui_catraca, possui_totem,
        cancela_qtd_sentido_unico, cancela_qtd_duplo_sentido,
        catraca_qtd_sentido_unico, catraca_qtd_duplo_sentido,
        totem_qtd_simples, totem_qtd_duplo,
        alarme_tipo, internet_exclusiva, produto
      )
    `).not("sale_forms", "is", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("customer_portfolio").select("razao_social, unidades, mensalidade, taxa_ativacao, cameras, portoes, portas, cancelas, catracas, totem_simples, totem_duplo, faciais_hik, faciais_avicam, tipo, sistema")
      .not("mensalidade", "is", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("orcamento_produtos").select("*").eq("ativo", true).order("categoria").order("nome"),
    supabase.from("orcamento_kits").select("*, orcamento_kit_itens(*, orcamento_produtos(*))").eq("ativo", true).order("categoria").order("nome"),
  ]);
  return { projects: projects || [], portfolio: portfolio || [], produtos: produtos || [], kits: kits || [] };
}

function buildChatSystemPrompt(ctx: any, sessao: any) {
  const sessionInfo = sessao ? `
## DADOS DA SESSÃO:
- Cliente/Condomínio: ${sessao.nome_cliente}
${sessao.endereco_condominio ? `- Endereço: ${sessao.endereco_condominio}` : ''}
${sessao.email_cliente ? `- Email: ${sessao.email_cliente}` : ''}
${sessao.telefone_cliente ? `- Telefone: ${sessao.telefone_cliente}` : ''}
${sessao.vendedor_nome ? `- Vendedor: ${sessao.vendedor_nome}` : ''}
` : '';

  return `Você é um consultor técnico-comercial da Emive, especialista em portaria digital e segurança condominial.
${sessionInfo}
Você está conduzindo uma ENTREVISTA DE VISITA TÉCNICA com um vendedor que está no condomínio. Siga o roteiro abaixo de forma natural e conversacional, coletando todas as informações necessárias para montar a proposta comercial.

## ROTEIRO DA VISITA TÉCNICA (siga esta ordem):

### 1. IDENTIFICAÇÃO E ESCOPO (início)
- Cumprimente o vendedor pelo nome, confirme o condomínio e pergunte:
- Qual o número de unidades (apartamentos) e blocos?
- Qual o escopo desejado: CFTV (monitoramento), portaria remota/app, controle de acesso (facial/RFID), automação de portões/cancelas, cerca elétrica, alarme/IVA?

### 2. ENTRADAS E ACESSOS
- Quantas portarias/guaritas?
- Quantos portões de veículos (tipo: deslizante, pivotante, basculante)?
- Quantas portas de pedestre?
- Possui cancela? Quantas e de que tipo (sentido único/duplo)?
- Possui catraca? Quantas e de que tipo?
- Possui ou deseja totem? Quantos (simples/duplo)?

### 3. COBERTURA POR CÂMERAS (CFTV)
- Quantos pontos de câmera quer cobrir (entrada principal, garagens, hall, elevadores, áreas de lazer)?
- Tem preferência por IP ou Turbo/analógico?
- Quantas câmeras de elevador?

### 4. INFRAESTRUTURA ELÉTRICA E DE REDE
- Existe rack/sala de equipamentos?
- Tomadas e quadro elétrico próximo?
- Internet (velocidade/upstream) e local do modem/roteador?
- Internet exclusiva para o sistema?

### 5. DISTÂNCIAS E CABEAMENTO
- Medir/estimar distância (metros) entre rack e pontos das câmeras/portões/antenas
- Isso serve para calcular cabos e quantidade

### 6. ENERGIA DE BACKUP
- Deseja nobreak/estação (para rack/câmeras/portões)?
- Já há baterias ou nobreaks existentes?

### 7. EQUIPAMENTOS EXISTENTES
- Há equipamentos já instalados (câmeras, NVR/DVR, cabos) que quer reaproveitar?
- Tem projetos ou fotos da infraestrutura atual?

### 8. ALARME E PERÍMETRO
- Tipo de alarme desejado?
- Necessita cerca elétrica? Metragem linear?
- Necessita IVA (detecção perimetral)? Quantas zonas?

### 9. INTERFONIA E COMUNICAÇÃO
- Como funciona a interfonia atual?
- Transbordo para apartamentos?

## REGRAS DE CONDUÇÃO:
- Faça as perguntas de forma natural, agrupando 2-3 perguntas relacionadas por vez (NÃO despeje todas de uma vez)
- Use linguagem informal e técnica (é um profissional)
- Quando o vendedor responder, reconheça a resposta e avance para o próximo bloco
- Se o vendedor enviar fotos, reconheça e use como contexto para suas perguntas
- Sugira produtos/kits relevantes do catálogo conforme coleta as informações (com preços)
- Se o vendedor pular algum item, tudo bem, mas tente cobrir o máximo possível
- Mantenha um tom de parceria técnica, ajudando o vendedor a não esquecer nada

## VALIDAÇÃO FINAL:
Quando cobrir todos os blocos do roteiro (ou o vendedor indicar que já passou tudo), faça uma **VALIDAÇÃO COMPLETA**:
1. Liste um RESUMO ESTRUTURADO de tudo que foi coletado, organizado por bloco
2. Destaque itens que ficaram em aberto ou sem resposta
3. Sugira os kits e produtos que se encaixam no cenário, com preços
4. Pergunte ao vendedor: "Está tudo correto? Posso gerar a proposta comercial?"
5. Só após confirmação do vendedor, indique que ele pode clicar no botão "Gerar Proposta"

## CATÁLOGO DE PRODUTOS (com preços):
${JSON.stringify(ctx.produtos.map((p: any) => ({ id: p.id_produto, codigo: p.codigo, nome: p.nome, categoria: p.categoria, subgrupo: p.subgrupo, unidade: p.unidade, preco_atual: p.preco_unitario, preco_minimo: p.valor_minimo, locacao: p.valor_locacao, locacao_minimo: p.valor_minimo_locacao, instalacao: p.valor_instalacao })), null, 2)}

## KITS (composições com preços totais):
${JSON.stringify(ctx.kits.map((k: any) => ({ id_kit: k.id_kit, codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco_total: k.preco_kit, minimo_total: k.valor_minimo, locacao_total: k.valor_locacao, locacao_minimo_total: k.valor_minimo_locacao, instalacao_total: k.valor_instalacao, itens: (k.orcamento_kit_itens || []).map((i: any) => ({ codigo: i.orcamento_produtos?.codigo, produto: i.orcamento_produtos?.nome, qtd: i.quantidade, preco_unit: i.orcamento_produtos?.preco_unitario })) })), null, 2)}

## REFERÊNCIAS DE PREÇOS DA CARTEIRA:
${JSON.stringify(ctx.portfolio.slice(0, 8).map((c: any) => ({ razao: c.razao_social, unidades: c.unidades, mensalidade: c.mensalidade, taxa: c.taxa_ativacao, cameras: c.cameras, portoes: c.portoes, portas: c.portas })), null, 2)}

## SUGESTÕES RÁPIDAS POR CENÁRIO:
- Portaria remota + app com controle integrado → KIT CENTRAL PORTARIA VIRTUAL
- CFTV básico (4 câmeras) → KIT DVR 4 CH
- CFTV médio (8 câmeras) → KIT DVR 8 CH
- CFTV grande (até 16 câmeras) → KIT DVR 16 CH
- Detecção perimetral IVA → KIT IVA (1 ou 2 zonas)
- Cerca elétrica → KIT CERCA ELÉTRICA
- Câmera de elevador → KIT CAMERA DE ELEVADOR

Responda em português brasileiro.`;
}

function buildPropostaPrompt(ctx: any) {
  return `Você é um especialista em propostas comerciais de portaria digital e segurança condominial da empresa Emive.
Baseado no histórico da visita técnica com o vendedor, gere uma PROPOSTA COMERCIAL completa e profissional.

Use os produtos e kits cadastrados para dimensionar e precificar:

**Produtos (com todos os campos de preço: preco_unitario=atual, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao):**
${JSON.stringify(ctx.produtos.map((p: any) => ({ id: p.id_produto, codigo: p.codigo, nome: p.nome, categoria: p.categoria, subgrupo: p.subgrupo, unidade: p.unidade, preco_atual: p.preco_unitario, preco_minimo: p.valor_minimo, locacao: p.valor_locacao, locacao_minimo: p.valor_minimo_locacao, instalacao: p.valor_instalacao })), null, 2)}

**Kits (composições com preços totais):**
${JSON.stringify(ctx.kits.map((k: any) => ({ id_kit: k.id_kit, codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco_total: k.preco_kit, minimo_total: k.valor_minimo, locacao_total: k.valor_locacao, locacao_minimo_total: k.valor_minimo_locacao, instalacao_total: k.valor_instalacao, itens: (k.orcamento_kit_itens || []).map((i: any) => ({ codigo: i.orcamento_produtos?.codigo, produto: i.orcamento_produtos?.nome, qtd: i.quantidade, preco_unit: i.orcamento_produtos?.preco_unitario })) })), null, 2)}

**Projetos Recentes (referência de escopo):**
${JSON.stringify(ctx.projects.slice(0, 10), null, 2)}

**Carteira de Clientes (referência de preços):**
${JSON.stringify(ctx.portfolio.slice(0, 15), null, 2)}

Regras:
- Escreva em português brasileiro formal e profissional
- A proposta deve incluir: Resumo Executivo, Escopo dos Serviços, Equipamentos Detalhados (usando produtos/kits do catálogo), Investimento (taxa de ativação e mensalidade estimadas), Prazo de Implantação, Condições Gerais
- Use os produtos e preços do catálogo quando possível
- Se não houver dados suficientes para precificar, indique "valor sob consulta"
- Formate usando markdown com cabeçalhos, listas e tabelas
- Inclua todos os dados coletados na visita
- NÃO invente dados que não foram coletados`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, sessao_id, messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve session: by token (legacy) or by sessao_id (vendedor logado)
    let sessao: any;
    if (sessao_id) {
      const { data, error } = await supabase.from("orcamento_sessoes").select("*").eq("id", sessao_id).eq("status", "ativo").single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sessao = data;
    } else if (token) {
      const { data, error } = await supabase.from("orcamento_sessoes").select("*").eq("token", token).eq("status", "ativo").single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sessao = data;
    } else {
      return new Response(JSON.stringify({ error: "Token ou sessao_id obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = await fetchContextData(supabase);

    // Generate proposal
    if (action === "gerar_proposta") {
      const { data: allMsgs } = await supabase
        .from("orcamento_mensagens").select("role, content")
        .eq("sessao_id", sessao.id).order("created_at", { ascending: true });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: buildPropostaPrompt(ctx) },
            ...(allMsgs || []).map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: "Agora gere a proposta comercial completa baseada em tudo que coletamos na visita." },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const proposta = data.choices?.[0]?.message?.content || "Não foi possível gerar a proposta.";

      await supabase.from("orcamento_sessoes")
        .update({ proposta_gerada: proposta, proposta_gerada_at: new Date().toISOString(), status: "proposta_gerada" })
        .eq("id", sessao.id);

      return new Response(JSON.stringify({ proposta }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Regular chat - stream response
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        await supabase.from("orcamento_mensagens").insert({ sessao_id: sessao.id, role: "user", content: lastMsg.content });
      }
    }

    const requestBody = JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: buildChatSystemPrompt(ctx, sessao) },
          ...messages,
        ],
        stream: true,
      });
    console.log("Request body size:", requestBody.length, "chars");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: requestBody,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const originalBody = response.body!;
    const [streamForClient, streamForSave] = originalBody.tee();

    const savePromise = (async () => {
      const reader = streamForSave.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch {}
        }
      }
      if (fullContent) {
        await supabase.from("orcamento_mensagens").insert({ sessao_id: sessao.id, role: "assistant", content: fullContent });
      }
    })();

    savePromise.catch(e => console.error("Failed to save assistant message:", e));

    return new Response(streamForClient, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("orcamento-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
