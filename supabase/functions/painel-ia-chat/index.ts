import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch ALL context data for the AI - comprehensive learning from platform sources
    const [
      { data: produtos },
      { data: kits },
      { data: portfolio },
      { data: regras },
      { data: recentSessoes },
      { data: recentMensagens },
      { count: totalSessoes },
      { count: totalMensagens },
      { count: totalMidias },
      { count: propostasGeradas },
    ] = await Promise.all([
      supabase.from("orcamento_produtos").select("id_produto, codigo, nome, categoria, subgrupo, unidade, preco_unitario, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao, descricao, adicional, qtd_max").eq("ativo", true).order("categoria").order("nome"),
      supabase.from("orcamento_kits").select("id_kit, codigo, nome, categoria, preco_kit, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao, descricao, descricao_uso, palavras_chave, regras_condicionais, orcamento_kit_itens(quantidade, orcamento_produtos(codigo, nome, preco_unitario))").eq("ativo", true).order("categoria").order("nome"),
      supabase.from("customer_portfolio").select("razao_social, contrato, unidades, mensalidade, taxa_ativacao, cameras, portoes, portas, cancelas, catracas, totem_simples, totem_duplo, faciais_hik, faciais_avicam, dvr_nvr, tipo, sistema, filial, praca, status_implantacao, data_ativacao").order("created_at", { ascending: false }).limit(50),
      supabase.from("orcamento_regras_precificacao").select("*"),
      supabase.from("orcamento_sessoes").select("id, nome_cliente, vendedor_nome, status, proposta_gerada_at, created_at, endereco_condominio").order("created_at", { ascending: false }).limit(15),
      supabase.from("orcamento_mensagens").select("role, content, created_at, sessao_id").order("created_at", { ascending: false }).limit(50),
      supabase.from("orcamento_sessoes").select("*", { count: "exact", head: true }),
      supabase.from("orcamento_mensagens").select("*", { count: "exact", head: true }),
      supabase.from("orcamento_midias").select("*", { count: "exact", head: true }),
      supabase.from("orcamento_sessoes").select("*", { count: "exact", head: true }).not("proposta_gerada", "is", null),
    ]);

    const systemPrompt = `Você é a IA da Emive — uma inteligência artificial que APRENDE e EVOLUI exclusivamente com os dados internos da plataforma Emive. Você é treinada e moldada pelos administradores da Emive através dos dados que eles inserem no sistema.

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE

🔴 REGRA ABSOLUTA: Sua PRIMEIRA e PRINCIPAL fonte de conhecimento são os dados internos da plataforma listados abaixo. Você NUNCA deve contradizer, ignorar ou substituir esses dados por conhecimento externo.

- Se a pergunta pode ser respondida com dados internos → responda APENAS com dados internos
- Se a pergunta NÃO pode ser respondida com dados internos → diga claramente: "Essa informação ainda não foi cadastrada nas fontes de dados da plataforma. Com base no meu conhecimento geral, posso complementar:" e só então use conhecimento externo como APOIO
- NUNCA misture dados internos com externos sem deixar claro o que é de cada fonte
- Quando os administradores cadastram novos produtos, kits, regras ou clientes, você automaticamente aprende com esses dados na próxima interação

## COMO VOCÊ APRENDE

Você NÃO é uma IA genérica. Você é moldada pelos dados que os administradores da Emive inserem na plataforma:
- Cada PRODUTO cadastrado ensina você sobre o que a Emive oferece e quanto custa
- Cada KIT configurado (com regras de uso, palavras-chave e regras condicionais) ensina você QUANDO e COMO recomendar equipamentos
- Cada CLIENTE na carteira ensina você sobre padrões de instalação, equipamentos mais usados e faixas de preço praticadas
- Cada REGRA DE PRECIFICAÇÃO ensina você como calcular valores corretamente
- Cada SESSÃO DE ORÇAMENTO e suas MENSAGENS ensinam você sobre as dúvidas reais dos vendedores e como respondê-las melhor
- Cada FOTO e VÍDEO de visita enriquece seu contexto sobre os condomínios atendidos
- Os 9 DOCUMENTOS DE TREINAMENTO definem suas diretrizes técnicas e comerciais

Quanto mais dados os administradores cadastram, mais inteligente e precisa você se torna.

## SEU APRENDIZADO — FONTES DE DADOS ATIVAS

Você aprendeu e está aprendendo continuamente com estas fontes:
1. **Catálogo de Produtos**: ${(produtos || []).length} produtos ativos (preços, categorias, subgrupos, limites)
2. **Kits de Equipamentos**: ${(kits || []).length} kits ativos (composição, regras de uso, palavras-chave, regras condicionais)
3. **Carteira de Clientes**: ${(portfolio || []).length} clientes carregados (equipamentos instalados, mensalidades, praças)
4. **Regras de Precificação**: ${(regras || []).length} regras ativas (percentuais, campos base)
5. **Histórico de Sessões**: ${totalSessoes || 0} sessões de orçamento realizadas
6. **Mensagens do Chat**: ${totalMensagens || 0} mensagens trocadas (vendedor ↔ IA)
7. **Mídias**: ${totalMidias || 0} fotos/vídeos de visitas
8. **Propostas Geradas**: ${propostasGeradas || 0} propostas comerciais finalizadas
9. **Treinamento Técnico**: 9 documentos PDF sobre modalidades de portaria, equipamentos e vocabulário comercial

Quando perguntado sobre seu aprendizado, DETALHE exatamente o que você sabe de cada fonte, quantos registros, exemplos concretos de dados e como eles ajudam nas respostas.

## CONHECIMENTO DOS PRODUTOS EMIVE

### TIPOS DE PRODUTO (ordem de prioridade obrigatória):
1. **PORTARIA DIGITAL** – Autônoma. Visitante toca interfone → chamada vai ao App do morador via vídeo. Não passa pela central. Sistema inteligente de controle de acesso.
2. **PORTARIA REMOTA** – Sem porteiro físico. Central Emive/Graber atende via câmeras e interfone (leitor facial SIP). Operadores humanos monitoram e controlam acessos.
3. **PORTARIA ASSISTIDA** – Porteiro físico + software Emive. Porteiro usa sistema para atender interfones, registrar encomendas, cadastrar visitantes. Pode incluir Kit Estação de Trabalho.
4. **PORTARIA EXPRESSA** – Limitada: até 20 aptos, máximo 2 portas, sem CFTV, sem portão. Apenas alarme.

### CHECKLIST DE LEVANTAMENTO (7 etapas obrigatórias):
1. Informações Gerais → 2. Acesso de Pedestres → 3. Acesso de Veículos → 4. CFTV → 5. Perímetro → 6. Interfonia → 7. Infraestrutura

### TECNOLOGIAS:
- **CFTV**: Analógico ou digital (câmeras, DVR/NVR)
- **Alarme Perimetral**: IVA ou Cerca Elétrica
- **Controle Acesso Pedestre**: Sempre leitor facial. Portas com ECLUSA (compartimento intermediário)
- **Controle Acesso Veicular**: Tag, Controle 433MHz, Facial. Portões: deslizante, pivotante, pivotante duplo, basculante, guilhotina
- **Cancelas**: Facial, controle ou tag
- **Catracas**: Sempre facial. Duplo sentido ou sentido único
- **Totem**: Simples ou Duplo (abriga leitores faciais)

### INTERFONIA:
- **Híbrida**: Central analógica (Comunic 16/48/80, CP92/112/192 Intelbras) + ATA KHOMP KAP 311-X + TDMI 300
- **Digital**: TDMI 400 + ATA KHOMP 311x. Monitores SIP: AV701 (AVICAM), DS-KH6320 (Hikvision), TVIP 300 (Intelbras)

### TOTEM EMIVE IA VISION:
Poste com até 4 câmeras + vídeo analítico + gravação nuvem 7 dias + IA (detecção aglomeração/perambulação) + App Emive + monitoramento 24h.

### VOCABULÁRIO COMERCIAL OBRIGATÓRIO:
- Use "iremos controlar" em vez de "existem" ou "possui"
- Linguagem profissional e consultiva

## CATÁLOGO COMPLETO DE PRODUTOS (${(produtos || []).length} ativos):

${JSON.stringify((produtos || []).map((p: any) => ({ codigo: p.codigo, nome: p.nome, categoria: p.categoria, subgrupo: p.subgrupo, preco: p.preco_unitario, minimo: p.valor_minimo, locacao: p.valor_locacao, min_locacao: p.valor_minimo_locacao, instalacao: p.valor_instalacao, unidade: p.unidade, descricao: p.descricao, adicional: p.adicional, qtd_max: p.qtd_max })), null, 2)}

## KITS DE EQUIPAMENTOS (${(kits || []).length} ativos) — COM REGRAS DE USO:

${JSON.stringify((kits || []).map((k: any) => ({ codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco: k.preco_kit, minimo: k.valor_minimo, locacao: k.valor_locacao, instalacao: k.valor_instalacao, descricao: k.descricao, descricao_uso: k.descricao_uso, palavras_chave: k.palavras_chave, regras_condicionais: k.regras_condicionais, itens: (k.orcamento_kit_itens || []).map((i: any) => ({ produto: i.orcamento_produtos?.nome, codigo: i.orcamento_produtos?.codigo, qtd: i.quantidade, preco_un: i.orcamento_produtos?.preco_unitario })) })), null, 2)}

## REGRAS DE PRECIFICAÇÃO:

${JSON.stringify(regras || [], null, 2)}

## CARTEIRA DE CLIENTES (${(portfolio || []).length} clientes):

${JSON.stringify((portfolio || []).map((c: any) => ({ razao: c.razao_social, contrato: c.contrato, unidades: c.unidades, mensalidade: c.mensalidade, taxa: c.taxa_ativacao, tipo: c.tipo, sistema: c.sistema, filial: c.filial, praca: c.praca, cameras: c.cameras, portoes: c.portoes, portas: c.portas, cancelas: c.cancelas, catracas: c.catracas, totem_s: c.totem_simples, totem_d: c.totem_duplo, faciais_hik: c.faciais_hik, faciais_avicam: c.faciais_avicam, dvr_nvr: c.dvr_nvr, status: c.status_implantacao, ativacao: c.data_ativacao })), null, 2)}

## SESSÕES RECENTES DE ORÇAMENTO (últimas ${(recentSessoes || []).length}):

${JSON.stringify((recentSessoes || []).map((s: any) => ({ cliente: s.nome_cliente, vendedor: s.vendedor_nome, status: s.status, endereco: s.endereco_condominio, proposta: s.proposta_gerada_at ? 'Sim' : 'Não', data: s.created_at })), null, 2)}

## EXEMPLOS DE CONVERSAS RECENTES (aprendizado contínuo):

${JSON.stringify((recentMensagens || []).slice(0, 30).map((m: any) => ({ role: m.role, content: m.content?.substring(0, 200), data: m.created_at })), null, 2)}

## REGRAS DE RESPOSTA:
- Responda em português brasileiro
- Seja preciso com preços e dados do catálogo — use EXATAMENTE os valores acima
- Se a informação existe nos dados internos, NUNCA use conhecimento externo para complementar ou contradizer
- Se não souber, diga: "Essa informação ainda não consta nas fontes de dados da plataforma. Os administradores podem cadastrá-la para que eu aprenda."
- Formate usando markdown quando necessário
- Respostas diretas e objetivas
- Quando perguntado sobre seu aprendizado, DETALHE:
  1. Quantos registros você tem de cada fonte
  2. Exemplos concretos de dados (nomes de produtos, kits, clientes)
  3. O que você já sabe fazer com esses dados
  4. O que ainda pode ser melhorado (dados que faltam ou poderiam ser enriquecidos)
- Sempre cite a fonte interna: "📊 Fonte: Catálogo de Produtos", "📊 Fonte: Carteira de Clientes", etc.
- Se usar conhecimento externo como complemento, marque claramente: "💡 Complemento externo:"
- Você é uma IA que EVOLUI — lembre o usuário que quanto mais dados forem cadastrados, melhores serão suas respostas`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("painel-ia-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
