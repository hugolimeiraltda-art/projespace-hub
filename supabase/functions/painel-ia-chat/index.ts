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

    // Fetch context data for the AI to answer questions
    const [
      { data: produtos },
      { data: kits },
      { data: portfolio },
      { data: regras },
    ] = await Promise.all([
      supabase.from("orcamento_produtos").select("id_produto, codigo, nome, categoria, subgrupo, unidade, preco_unitario, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao").eq("ativo", true).order("categoria").order("nome"),
      supabase.from("orcamento_kits").select("id_kit, codigo, nome, categoria, preco_kit, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao, orcamento_kit_itens(quantidade, orcamento_produtos(codigo, nome, preco_unitario))").eq("ativo", true).order("categoria").order("nome"),
      supabase.from("customer_portfolio").select("razao_social, unidades, mensalidade, taxa_ativacao, cameras, portoes, portas, cancelas, catracas, totem_simples, totem_duplo, tipo, sistema").not("mensalidade", "is", null).order("created_at", { ascending: false }).limit(20),
      supabase.from("orcamento_regras_precificacao").select("*"),
    ]);

    const systemPrompt = `Você é a IA da Emive, especialista em portaria digital e segurança condominial. Responda às perguntas do administrador sobre produtos, preços, kits, regras de precificação, carteira de clientes e qualquer assunto técnico da empresa.

## CONHECIMENTO DOS PRODUTOS EMIVE

### TIPOS DE PRODUTO:
1. **PORTARIA REMOTA** – Sem porteiro físico. Central Emive/Graber atende via câmeras e interfone (leitor facial SIP). Operadores humanos monitoram e controlam acessos.
2. **PORTARIA DIGITAL** – Autônoma. Visitante toca interfone → chamada vai ao App do morador via vídeo. Não passa pela central. Sistema inteligente de controle de acesso.
3. **PORTARIA ASSISTIDA** – Porteiro físico + software Emive. Porteiro usa sistema para atender interfones, registrar encomendas, cadastrar visitantes. Pode incluir Kit Estação de Trabalho.
4. **PORTARIA EXPRESSA** – Limitada: até 20 aptos, máximo 2 portas, sem CFTV, sem portão. Apenas alarme.

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
  - Placa 8 ramais Comunic 48R → Comunic 16/48/80
  - Placa 16 ramais CP48/112 → CP112/192/198
- **Digital**: TDMI 400 + ATA KHOMP 311x. Monitores SIP: AV701 (AVICAM), DS-KH6320 (Hikvision), TVIP 300 (Intelbras)

### TOTEM EMIVE IA VISION:
Poste com até 4 câmeras + vídeo analítico + gravação nuvem 7 dias + IA (detecção aglomeração/perambulação) + App Emive + monitoramento 24h.

## CATÁLOGO ATUAL:

**Produtos (${(produtos || []).length} ativos):**
${JSON.stringify((produtos || []).map((p: any) => ({ codigo: p.codigo, nome: p.nome, categoria: p.categoria, preco: p.preco_unitario, minimo: p.valor_minimo, locacao: p.valor_locacao })), null, 2)}

**Kits (${(kits || []).length} ativos):**
${JSON.stringify((kits || []).map((k: any) => ({ codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco: k.preco_kit, itens: (k.orcamento_kit_itens || []).map((i: any) => ({ produto: i.orcamento_produtos?.nome, qtd: i.quantidade })) })), null, 2)}

**Regras de Precificação:**
${JSON.stringify(regras || [], null, 2)}

**Carteira de Clientes (amostra):**
${JSON.stringify((portfolio || []).slice(0, 10).map((c: any) => ({ razao: c.razao_social, unidades: c.unidades, mensalidade: c.mensalidade, taxa: c.taxa_ativacao, tipo: c.tipo })), null, 2)}

## REGRAS:
- Responda em português brasileiro
- Seja preciso com preços e dados do catálogo
- Se não souber, diga que não tem essa informação
- Formate usando markdown quando necessário
- Respostas diretas e objetivas`;

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
