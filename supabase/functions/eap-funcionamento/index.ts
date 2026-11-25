import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await db.auth.getUser(auth.replace("Bearer ", ""));
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Entre no sistema" }, 401);
    const { data: isStaff } = await db.rpc("is_staff", { _user_id: uid });
    if (!isStaff) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => null);
    const nome = typeof body?.nome === "string" ? body.nome.slice(0, 200) : "";
    const equips: string[] = Array.isArray(body?.equipamentos) ? body.equipamentos.filter((x: unknown) => typeof x === "string").slice(0, 40).map((x: string) => x.slice(0, 200)) : [];
    if (!nome || equips.length === 0) return json({ error: "Informe o ambiente e ao menos um equipamento" }, 400);

    // Contexto interno: kits cadastrados cujo nome aparece nos equipamentos
    const { data: kits } = await db.from("orcamento_kits").select("nome, descricao, descricao_uso").eq("ativo", true);
    const low = equips.join(" ").toLowerCase();
    const ctx = (kits || []).filter((k: any) => k.nome && low.includes(String(k.nome).toLowerCase()))
      .map((k: any) => "- " + k.nome + ": " + [k.descricao, k.descricao_uso].filter(Boolean).join(" | ")).join("\n");

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "IA não configurada" }, 500);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: "Você escreve o campo 'Funcionamento' da EAP de portaria digital Emive. Escreva 2 a 3 frases objetivas em português explicando como o ambiente funciona com os equipamentos listados (fluxo de acesso, autenticação, liberação, saída). Use SOMENTE os equipamentos informados e as descrições internas dos kits. Não invente equipamentos, cabeamento ou recursos que não estejam listados. Sem títulos, sem listas, sem markdown." },
          { role: "user", content: "Ambiente: " + nome + "\nEquipamentos:\n" + equips.map((e) => "- " + e).join("\n") + (ctx ? "\n\nDescrições internas dos kits:\n" + ctx : "") },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      const msg = r.status === 402 ? "Créditos de IA esgotados" : r.status === 429 ? "Muitas solicitações, tente em instantes" : "Falha na IA";
      console.error("eap-funcionamento", r.status, t);
      return json({ error: msg }, r.status);
    }
    const d = await r.json();
    const texto = String(d?.choices?.[0]?.message?.content || "").trim();
    if (!texto) return json({ error: "A IA não retornou texto" }, 502);
    return json({ texto });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro interno" }, 500);
  }
});
