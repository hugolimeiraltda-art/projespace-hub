import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { saleFormData, projectInfo, tapFormData, comments, attachments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em projetos de portaria digital e segurança condominial. 
Seu papel é analisar TODOS os dados disponíveis de um projeto — incluindo TAP (Termo de Abertura de Projeto), formulário de venda, comentários da equipe e lista de anexos — e gerar um resumo completo e profissional do escopo do projeto.

Regras:
- Escreva em português brasileiro formal
- Seja objetivo e técnico, mas acessível
- Organize por tópicos relevantes (Infraestrutura, CFTV, Alarme, Controle de Acesso, etc.)
- Mencione apenas os itens que foram preenchidos/informados
- Use números e quantidades sempre que disponíveis
- Destaque pontos de atenção quando houver
- Analise os comentários da equipe para extrair informações relevantes, decisões tomadas ou pendências
- Mencione os anexos disponíveis quando relevantes (ex: fotos de equipamentos, croquis, plantas)
- Termine com um breve resumo geral do porte do projeto
- NÃO invente dados que não foram fornecidos`;

    let userPrompt = `Gere um resumo executivo completo deste projeto de portaria digital:\n\n`;

    if (projectInfo) {
      userPrompt += `**Informações do Projeto:**\n- Condomínio: ${projectInfo.nome}\n- Cidade: ${projectInfo.cidade}, ${projectInfo.estado}\n- Vendedor: ${projectInfo.vendedor}\n\n`;
    }

    if (tapFormData && Object.keys(tapFormData).length > 0) {
      userPrompt += `**Dados do TAP (Termo de Abertura de Projeto):**\n${JSON.stringify(tapFormData, null, 2)}\n\n`;
    }

    if (saleFormData && Object.keys(saleFormData).length > 0) {
      userPrompt += `**Dados do Formulário de Venda:**\n${JSON.stringify(saleFormData, null, 2)}\n\n`;
    }

    if (comments && comments.length > 0) {
      userPrompt += `**Comentários da Equipe (histórico de discussão do projeto):**\n${comments.join('\n')}\n\n`;
    }

    if (attachments && attachments.length > 0) {
      userPrompt += `**Anexos disponíveis no projeto:**\n${attachments.join('\n')}\n\n`;
    }

    userPrompt += `Gere o resumo do escopo do projeto baseado em TODOS esses dados.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para geração de resumo." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar resumo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-project-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
