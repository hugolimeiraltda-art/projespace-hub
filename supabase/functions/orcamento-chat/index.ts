import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchSimilarProjects(supabase: any) {
  // Fetch recent completed projects with sale form data for context
  const { data: projects } = await supabase
    .from("projects")
    .select(`
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
    `)
    .not("sale_forms", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  // Fetch portfolio data for pricing reference
  const { data: portfolio } = await supabase
    .from("customer_portfolio")
    .select("razao_social, unidades, mensalidade, taxa_ativacao, cameras, portoes, portas, cancelas, catracas, totem_simples, totem_duplo, faciais_hik, faciais_avicam, tipo, sistema")
    .not("mensalidade", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  return { projects: projects || [], portfolio: portfolio || [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate session token
    const { data: sessao, error: sessaoError } = await supabase
      .from("orcamento_sessoes")
      .select("*")
      .eq("token", token)
      .eq("status", "ativo")
      .single();

    if (sessaoError || !sessao) {
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If action is "gerar_proposta", generate final proposal
    if (action === "gerar_proposta") {
      const { projects, portfolio } = await fetchSimilarProjects(supabase);

      const systemPrompt = `Você é um especialista em propostas comerciais de portaria digital e segurança condominial da empresa Emive.
Baseado no histórico da conversa com o cliente, gere uma PROPOSTA COMERCIAL completa e profissional.

Use os dados de projetos similares abaixo como referência para dimensionamento e precificação:

**Projetos Recentes (referência de escopo):**
${JSON.stringify(projects.slice(0, 10), null, 2)}

**Carteira de Clientes (referência de preços):**
${JSON.stringify(portfolio.slice(0, 15), null, 2)}

Regras:
- Escreva em português brasileiro formal e profissional
- A proposta deve incluir: Resumo Executivo, Escopo dos Serviços, Equipamentos, Investimento (taxa de ativação e mensalidade estimadas), Prazo de Implantação, Condições Gerais
- Use valores baseados nos dados reais da carteira de clientes quando possível
- Se não houver dados suficientes para precificar, indique "valor sob consulta" 
- Formate usando markdown com cabeçalhos, listas e tabelas
- Inclua o nome do cliente e dados coletados na conversa
- NÃO invente dados que o cliente não forneceu`;

      // Get all messages from this session
      const { data: allMsgs } = await supabase
        .from("orcamento_mensagens")
        .select("role, content")
        .eq("sessao_id", sessao.id)
        .order("created_at", { ascending: true });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...(allMsgs || []).map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: "Agora gere a proposta comercial completa baseada em tudo que conversamos." },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const proposta = data.choices?.[0]?.message?.content || "Não foi possível gerar a proposta.";

      // Save proposal
      await supabase
        .from("orcamento_sessoes")
        .update({ proposta_gerada: proposta, proposta_gerada_at: new Date().toISOString(), status: "proposta_gerada" })
        .eq("id", sessao.id);

      return new Response(JSON.stringify({ proposta }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular chat - stream response
    const { projects, portfolio } = await fetchSimilarProjects(supabase);

    const systemPrompt = `Você é um consultor comercial especialista da Emive, empresa de portaria digital e segurança condominial.
Seu objetivo é conversar com o cliente para entender as necessidades dele e coletar informações para montar uma proposta comercial.

Você deve coletar as seguintes informações de forma natural e conversacional:
1. Nome do condomínio e localização (cidade/estado)
2. Quantidade de unidades/apartamentos e blocos
3. Quantidade de acessos (portões, portas de pedestre, cancelas)
4. Se já possui sistema de CFTV (câmeras) ou se precisa de novo
5. Se precisa de controle de acesso facial, tag, ou ambos
6. Se possui cerca elétrica ou alarme
7. Se precisa de catraca ou totem
8. Necessidades especiais ou preocupações

Use estes dados de projetos reais como referência para fazer perguntas relevantes:
${JSON.stringify(projects.slice(0, 5), null, 2)}

Referência de equipamentos e porte de clientes:
${JSON.stringify(portfolio.slice(0, 10), null, 2)}

Regras:
- Seja cordial, profissional e objetivo
- Faça uma ou duas perguntas por vez, nunca todas de uma vez
- Use linguagem acessível, evite jargão técnico excessivo
- Quando tiver informações suficientes, avise o cliente que pode gerar a proposta
- Responda em português brasileiro
- Na primeira mensagem, apresente-se e pergunte o nome do condomínio e localização`;

    // Save user message
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        await supabase.from("orcamento_mensagens").insert({
          sessao_id: sessao.id,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    // We need to intercept the stream to save the assistant response
    const originalBody = response.body!;
    const [streamForClient, streamForSave] = originalBody.tee();

    // Save assistant response in background
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
        await supabase.from("orcamento_mensagens").insert({
          sessao_id: sessao.id,
          role: "assistant",
          content: fullContent,
        });
      }
    })();

    // Don't await - let it run in background
    savePromise.catch(e => console.error("Failed to save assistant message:", e));

    return new Response(streamForClient, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("orcamento-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
