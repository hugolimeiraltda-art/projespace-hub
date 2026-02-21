import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchContextData(supabase: any) {
  const [{ data: projects }, { data: portfolio }, { data: produtos }, { data: kits }, { data: feedbacks }] = await Promise.all([
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
    supabase.from("orcamento_kits").select("*, descricao_uso, palavras_chave, regras_condicionais, orcamento_kit_itens(*, orcamento_produtos(*))").eq("ativo", true).order("categoria").order("nome"),
    supabase.from("orcamento_proposta_feedbacks").select("acertos, erros, sugestoes, proposta_adequada, nota_precisao").order("created_at", { ascending: false }).limit(20),
  ]);
  return { projects: projects || [], portfolio: portfolio || [], produtos: produtos || [], kits: kits || [], feedbacks: feedbacks || [] };
}

function buildVisitSystemPrompt(ctx: any, sessao: any) {
  const sessionInfo = sessao ? `
## DADOS JÁ COLETADOS DA SESSÃO (NÃO pergunte novamente):
- Nome do Condomínio: ${sessao.nome_cliente}
${sessao.endereco_condominio ? `- Endereço: ${sessao.endereco_condominio}` : ''}
${sessao.email_cliente ? `- Email do Cliente: ${sessao.email_cliente}` : ''}
${sessao.telefone_cliente ? `- Telefone do Cliente: ${sessao.telefone_cliente}` : ''}
${sessao.vendedor_nome ? `- Vendedor: ${sessao.vendedor_nome}` : ''}
` : '';

  return `Você é um consultor técnico da Emive, especialista em portaria digital e segurança condominial.

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE
🔴 Sua PRIMEIRA e PRINCIPAL fonte de conhecimento são os dados internos da plataforma Emive (catálogo de produtos, kits, carteira de clientes, regras de precificação). NUNCA contradiga, ignore ou substitua esses dados por conhecimento externo. Conhecimento externo é APENAS complemento secundário, e deve ser claramente identificado.

${sessionInfo}
Você está guiando um VENDEDOR que está FISICAMENTE no local do condomínio fazendo uma visita técnica.

## CONHECIMENTO TÉCNICO DOS PRODUTOS EMIVE (USE PARA DIMENSIONAR E ORIENTAR O VENDEDOR)

### TIPOS DE PRODUTO (4 modalidades, SEMPRE apresente nesta ordem):

**1. PORTARIA DIGITAL** – Modelo autônomo baseado em tecnologia (reconhecimento facial, leitura veicular, app, QR Code). Quando o visitante toca o interfone (leitor facial), a chamada vai direto para o App do morador via chamada de vídeo. Se não atender, redireciona para até 3 números de telefone (fixo, celular ou interfone de parede). NÃO passa pela central de atendimento. É um sistema inteligente de controle de acesso, não é "porteiro remoto".

**2. PORTARIA REMOTA** – O condomínio NÃO possui porteiro físico. Todo atendimento é feito pela Central de Portaria Emive/Graber com operadores humanos monitorando câmeras e controlando acessos em tempo real. Quando o visitante toca o interfone (leitor facial com protocolo SIP), a chamada cai no atendente da central, que contata os moradores.

**3. PORTARIA ASSISTIDA** – Porteiro físico na guarita usando o software Emive para atender interfones, registrar encomendas e cadastrar visitantes. É a portaria digital COM porteiro. Pode incluir Kit Estação de Trabalho (computador desktop + monitor + teclado + mouse + nobreak + headset).

**4. PORTARIA EXPRESSA** – Leitor facial na portaria externa, limitado a prédios de ATÉ 20 apartamentos e NO MÁXIMO 2 portas. NÃO monitora portão, NÃO faz controle de acesso de portão, NÃO tem CFTV. Apenas monitora alarme. Se o cliente quiser mais serviços, oferecer Portaria Digital.

### TECNOLOGIAS CONTEMPLADAS (Remota, Digital e Assistida):

**CFTV**: Analógico ou digital. Câmeras, DVRs/NVRs. Câmeras de elevador são específicas.

**ALARME PERIMETRAL**: IVA (Infravermelho Ativo) ou Cerca Elétrica. Necessita cabo blindado dos sensores até a central.

**CONTROLE DE ACESSO PEDESTRE**: Sempre usa leitor facial como controlador E método de autenticação. Portas de pedestre para rua e portas nos blocos. ECLUSA = após a porta externa existe outra porta interna formando compartimento intermediário de segurança.

**CONTROLE DE ACESSO VEICULAR**: Métodos de autenticação: Tag veicular, Controle Remoto 433MHz, Leitor Facial. Tipos de portão:
- Deslizante (abre lateralmente)
- Pivotante (abre como porta, 1 folha e 1 motor)
- Pivotante Duplo (2 folhas e 2 motores)
- Basculante (abre para cima)
- Guilhotina (abre 100% na vertical, usa 1 máquina de motor basculante)
Todos os portões são abertos APENAS de forma autenticada.

**CANCELAS**: Automatizadas com abertura por leitor facial, controle remoto ou tag veicular.

**CATRACAS**: SEMPRE com autenticação via leitor facial. Pode ser de duplo sentido (entrada e saída pela mesma) ou sentido único (uma pra entrar, outra pra sair).

**TOTEM PARA FACIAL**: 2 modelos – Simples e Duplo. Abrigam leitores faciais para abrir cancelas ou portões.

### INTERFONIA:

**HÍBRIDA** – Central analógica + ATA KHOMP KAP 311-X para integrar ao sistema de telefonia Emive.
- Centrais: Comunic 16, Comunic 48, Comunic 80, CP92, CP112, CP192 (fabricante Intelbras/Maxcom)
- Telefone de parede: TDMI 300 (Intelbras)
- Placas de ramais:
  - Placa 8 ramais desbalanceada Comunic 48R → compatível com Comunic 16/48/80
  - Placa 16 ramais desbalanceada CP48/112 → compatível com CP112/CP192/CP198
- Cada Comunic sai de fábrica com 1 placa de 8 ramais; cada CP sai com 1 placa de 16 ramais.

**DIGITAL** – Todos os equipamentos digitais. Telefone TDMI 400 (Intelbras), central = ATA KHOMP 311x.
Monitores SIP opcionais (permite ver câmera do interfone):
- Monitor AV701 Touch Screen (AVICAM)
- Tele vídeo porteiro DS-KH6320 (Hikvision)
- TVIP 300 Video IP (Intelbras)
Todos compatíveis com o ATA.

### TOTEM EMIVE IA VISION:
Poste exclusivo com até 4 câmeras com vídeo analítico conectadas à Central Emive. Gravação em nuvem até 7 dias. IA para detecção de aglomeração e perambulação. Imagens ao vivo via Super App Emive. Monitoramento 24h.

## CHECKLIST DA VISITA (siga esta ordem):

### 1. INFORMAÇÕES GERAIS
- Qual produto o vendedor quer orçar? (Digital, Remota, Assistida ou Expressa)
- Quantidade de blocos
- Quantidade de unidades (apartamentos ou casas)
- Quantos andares e apartamentos por andar
- Tem portaria? (24h, somente dia, somente noite?)
- Solicitar planta baixa ao síndico
- **FOTOS**: Fachada do condomínio

### 2. ACESSO DE PEDESTRES
- Quantas portas de pedestre para a rua iremos CONTROLAR?
- Alguma dessas portas possui ECLUSA?
- Se sim, quantas eclusas iremos controlar?
- Quantas portas de pedestre nos blocos iremos controlar?
- **FOTOS**: Por dentro e por fora de cada porta (e das eclusas, se houver)

### 3. ACESSO DE VEÍCULOS
- Quantos portões de veículos iremos controlar?
- Tipo de cada: Deslizante, basculante, pivotante, pivotante duplo, guilhotina?
- Método de abertura: controle, TAG, facial?
- **FOTOS**: Portões por dentro e por fora + motores dos portões

### 4. CFTV (CÂMERAS)
- Quantas câmeras e DVRs o condomínio tem atualmente?
- São câmeras analógicas ou IP? Tem NVR?
- São Full HD? Todas funcionando?
- Câmeras no elevador? Quantas?
- Câmeras novas necessárias?
- **FOTOS**: 4+ câmeras instaladas, DVR/NVR (marca/modelo) e local, monitor com visualização, locais para câmeras novas

### 5. PERÍMETRO
- Possui alarme perimetral (cerca ou IVA)?
- Se não, verificar necessidade de proteção dos muros
- Metros de cabo blindado necessários (sensores até central)?
- **FOTOS**: Equipamentos existentes ou muros para instalação

### 6. INTERFONIA
- Quantos interfones possui?
- Qual tipo de interfonia quer? (Híbrida ou Digital)
- **FOTOS**: Central de interfonia (verificar se é Intelbras Comunic/Maxcom)

### 7. INFRAESTRUTURA
- Metros de eletroduto galvanizado: portas/portões até rack Emive
- Metros de eletroduto galvanizado: QDG até rack Emive
- **FOTOS**: Local do rack (central), QDG, distância portões-rack, distância QDG-rack

## CATÁLOGO DE PRODUTOS E KITS (use para dimensionar e precificar):

**Produtos (catálogo completo com preços):**
${JSON.stringify(ctx.produtos.map((p: any) => ({ id: p.id_produto, codigo: p.codigo, nome: p.nome, categoria: p.categoria, subgrupo: p.subgrupo, unidade: p.unidade, preco_atual: p.preco_unitario, preco_minimo: p.valor_minimo, locacao: p.valor_locacao, locacao_minimo: p.valor_minimo_locacao, instalacao: p.valor_instalacao })), null, 2)}

**Kits (composições com preços totais e REGRAS DE USO - use estas regras para saber QUANDO sugerir cada kit):**
${JSON.stringify(ctx.kits.map((k: any) => ({ id_kit: k.id_kit, codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco_total: k.preco_kit, minimo_total: k.valor_minimo, locacao_total: k.valor_locacao, locacao_minimo_total: k.valor_minimo_locacao, instalacao_total: k.valor_instalacao, quando_usar: k.descricao_uso || null, palavras_chave: k.palavras_chave || [], regras: k.regras_condicionais || [], itens: (k.orcamento_kit_itens || []).map((i: any) => ({ codigo: i.orcamento_produtos?.codigo, produto: i.orcamento_produtos?.nome, qtd: i.quantidade, preco_unit: i.orcamento_produtos?.preco_unitario })) })), null, 2)}

## REFERÊNCIAS DE PREÇOS DA CARTEIRA (resumo):
${JSON.stringify(ctx.portfolio.slice(0, 8).map((c: any) => ({ razao: c.razao_social, unidades: c.unidades, mensalidade: c.mensalidade, taxa: c.taxa_ativacao, cameras: c.cameras, portoes: c.portoes, portas: c.portas })), null, 2)}

## REGRAS CRÍTICAS DE PRODUTOS E KITS:
- **VOCÊ SÓ PODE REFERENCIAR PRODUTOS E KITS QUE EXISTEM NO CATÁLOGO ACIMA.** Nunca invente nomes de produtos, marcas ou modelos que não estejam listados.
- **NUNCA cite marcas, modelos ou nomes de equipamentos que não constem na lista de produtos ou kits fornecida.** Se não souber o nome exato, use apenas a descrição genérica (ex: "kit portão pivotante" se existir no catálogo).
- **PRIORIZE KITS sobre produtos individuais.** Kits são composições prontas de produtos que atendem um cenário completo (ex: kit portão deslizante, kit porta pedestre). Quando o vendedor descrever uma necessidade, sugira o KIT correspondente do catálogo, não os itens avulsos.
- **Ao sugerir equipamentos, use EXATAMENTE os nomes e códigos que constam no catálogo.** Copie o nome do produto/kit tal como aparece na lista.
- **Se não existir um produto ou kit no catálogo para atender uma necessidade específica, diga que será necessário consultar a equipe técnica.** Não invente.

## REGRAS GERAIS:
- **NUNCA use "existem" ou "possui" ao perguntar sobre quantidades. SEMPRE use "iremos controlar" (ex: "quantas portas iremos controlar?" e não "quantas portas existem?")**
- **FAÇA APENAS UMA PERGUNTA POR VEZ.** Nunca envie múltiplas perguntas na mesma mensagem. Espere a resposta antes de perguntar a próxima.
- Guie o vendedor etapa por etapa, UMA SEÇÃO POR VEZ
- Peça fotos e vídeos específicos em cada etapa (o vendedor pode enviar mídia pelo chat)
- Quando o vendedor enviar uma foto, reconheça e peça a próxima
- Seja objetivo e direto - o vendedor está em campo
- Use linguagem informal e técnica (é um profissional, não um cliente)
- Ao receber dados, confirme o entendimento e passe para o próximo item
- Quando tiver informações suficientes de todas as seções, avise que pode gerar a proposta
- Na primeira mensagem, cumprimente o vendedor PELO NOME se disponível, confirme o nome do condomínio e endereço (se disponíveis), e faça APENAS a primeira pergunta do checklist (qual produto quer orçar)
- NUNCA pergunte informações que já estão listadas em "DADOS JÁ COLETADOS DA SESSÃO"
- Mensagens curtas e diretas, máximo 2-3 linhas por mensagem
- Use seu conhecimento técnico dos produtos para SUGERIR o kit ou produto adequado do catálogo quando o vendedor descrever o cenário
- Se o vendedor mencionar Portaria Expressa, lembre que é limitada a 20 aptos e 2 portas, sem CFTV
- Responda em português brasileiro`;
}

function buildPropostaPrompt(ctx: any, sessao: any) {
  return `Você é um especialista em propostas comerciais de portaria digital e segurança condominial da empresa Emive (OUTSOURCING PCI).

## PRINCÍPIO FUNDAMENTAL: DADOS INTERNOS PRIMEIRO — SEMPRE
🔴 Use EXCLUSIVAMENTE os produtos, kits, preços e dados do catálogo interno da Emive fornecido abaixo. NUNCA invente produtos, marcas ou modelos que não constem no catálogo. Se precisar complementar com conhecimento externo, identifique claramente.

Baseado no histórico da visita técnica com o vendedor, gere uma PROPOSTA COMERCIAL no formato padrão Emive.

## FORMATO OBRIGATÓRIO DA PROPOSTA (siga EXATAMENTE esta estrutura em markdown):

# PROPOSTA

## OUTSOURCING PCI

| | |
|---|---|
| **PROPOSTA:** [número sequencial] - **DATA:** ${new Date().toLocaleDateString('pt-BR')} | |
| **Cliente:** [nome do condomínio] | **Telefone:** [telefone se disponível] |
| **Sr(a).** [nome do contato/síndico se disponível] | **E-mail:** [email se disponível] |
| **Consultor:** ${sessao?.vendedor_nome || '[vendedor]'} | |
| **ENDEREÇO DE COBRANÇA** | **ENDEREÇO DE INSTALAÇÃO** |
| [endereço completo] | [endereço completo] |

### PRODUTOS UTILIZADOS

| Qtde | Descrição |
|------|-----------|
| [qtd][unidade] | [NOME EXATO DO PRODUTO OU KIT DO CATÁLOGO] |

(liste TODOS os produtos e kits necessários, um por linha, usando EXATAMENTE os nomes do catálogo)

| | |
|---|---|
| **MONITORAMENTO 24 HORAS COM UNIDADE VOLANTE** | **R$ [valor]/mês** |
| **TAXA DE CONEXÃO** | **R$ [valor]** |

### Observações:

**ESTA PROPOSTA TEM VALIDADE DE 5 DIAS ÚTEIS.**

**NÃO SERÃO CONSIDERADAS PELA EMIVE NENHUMA CONDIÇÃO NÃO DESCRITA NESTA PROPOSTA.**

---

## REGRAS PARA PREENCHER A TABELA DE PRODUTOS:
1. Use APENAS produtos e kits que existem no catálogo abaixo
2. PRIORIZE KITS sobre produtos avulsos (ex: use "KIT PORTÃO DE GARAGEM DESLIZANTE" ao invés de listar itens separados)
3. A coluna "Qtde" deve ter o número + unidade (ex: "2.00un", "100un", "50.00un")
4. A coluna "Descrição" deve ter o NOME EXATO do produto/kit como aparece no catálogo, em MAIÚSCULAS
5. A mensalidade estimada vai no campo "MONITORAMENTO 24 HORAS COM UNIDADE VOLANTE"
6. A taxa de instalação/ativação vai no campo "TAXA DE CONEXÃO"
7. Use a carteira de clientes como referência para estimar mensalidade e taxa quando necessário
8. Se não tiver dados suficientes para precificar, coloque "Sob consulta"

## CATÁLOGO DE PRODUTOS (use nomes exatamente como aparecem aqui):
${JSON.stringify(ctx.produtos.map((p: any) => ({ id: p.id_produto, codigo: p.codigo, nome: p.nome, categoria: p.categoria, unidade: p.unidade, preco_atual: p.preco_unitario, preco_minimo: p.valor_minimo, locacao: p.valor_locacao, instalacao: p.valor_instalacao })), null, 2)}

## CATÁLOGO DE KITS (priorize kits sobre produtos avulsos):
${JSON.stringify(ctx.kits.map((k: any) => ({ id_kit: k.id_kit, codigo: k.codigo, nome: k.nome, categoria: k.categoria, preco_total: k.preco_kit, minimo_total: k.valor_minimo, locacao_total: k.valor_locacao, instalacao_total: k.valor_instalacao, quando_usar: k.descricao_uso || null, palavras_chave: k.palavras_chave || [], regras: k.regras_condicionais || [], itens: (k.orcamento_kit_itens || []).map((i: any) => ({ produto: i.orcamento_produtos?.nome, qtd: i.quantidade })) })), null, 2)}

## CARTEIRA DE CLIENTES (referência de preços mensalidade/taxa):
${JSON.stringify(ctx.portfolio.slice(0, 15).map((c: any) => ({ razao: c.razao_social, unidades: c.unidades, mensalidade: c.mensalidade, taxa: c.taxa_ativacao, cameras: c.cameras, portoes: c.portoes, portas: c.portas, tipo: c.tipo })), null, 2)}

## REGRAS CRÍTICAS:
- NÃO invente produtos, marcas ou modelos que não estejam no catálogo
- NÃO invente dados que não foram coletados na visita
- Se faltar informação, omita o campo ou coloque "A definir"
- Responda em português brasileiro

## APRENDIZADO COM FEEDBACKS ANTERIORES (aplique estas correções):
${ctx.feedbacks && ctx.feedbacks.length > 0 ? ctx.feedbacks.map((f: any) => `- ${f.proposta_adequada === 'sim' ? '✅' : f.proposta_adequada === 'parcialmente' ? '⚠️' : '❌'} Nota ${f.nota_precisao || '?'}/5${f.acertos ? ` | Acertos: ${f.acertos}` : ''}${f.erros ? ` | Erros: ${f.erros}` : ''}${f.sugestoes ? ` | Sugestão: ${f.sugestoes}` : ''}`).join('\n') : 'Nenhum feedback registrado ainda.'}`;
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
      const { data, error } = await supabase.from("orcamento_sessoes").select("*").eq("id", sessao_id).not("status", "eq", "cancelado").single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sessao = data;
    } else if (token) {
      const { data, error } = await supabase.from("orcamento_sessoes").select("*").eq("token", token).not("status", "eq", "cancelado").single();
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
            { role: "system", content: buildPropostaPrompt(ctx, sessao) },
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
          { role: "system", content: buildVisitSystemPrompt(ctx, sessao) },
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
