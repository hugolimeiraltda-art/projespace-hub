import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "larissa.facury@emive.com.br";
  const password = "@Emive123";

  // Create user
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: "Larissa Facury" },
  });

  let userId = created?.user?.id;
  if (createErr) {
    // Maybe already exists
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === email)?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
    }
    await supabase.auth.admin.updateUserById(userId, { password });
  }

  // Ensure profile + role
  await supabase.from("profiles").update({ nome: "Larissa Facury", must_change_password: true }).eq("id", userId);
  await supabase.from("user_roles").update({ role: "implantacao" }).eq("user_id", userId);

  // Wipe existing overrides for this user
  await supabase.from("user_menu_overrides").delete().eq("user_id", userId);

  const allowed = ["implantacao", "implantacao/ppe", "carteira-clientes-ppe"];

  // All known menu keys (must match useMenuPermissions.MENU_KEYS)
  const allKeys = [
    "dashboard","projetos","projetos/novo","projetos/informar-venda","projetos/lista",
    "implantacao","implantacao/analytics","implantacao/em-implantacao","implantacao/ppe",
    "implantacao/operacao-assistida","implantacao/pequenas-obras","implantacao/historico",
    "controle-estoque","manutencao","manutencao/preventivas","manutencao/chamados","manutencao/pendencias",
    "carteira-clientes","carteira-clientes-ppe","sucesso-cliente",
    "orcamentos","orcamentos/sessoes","orcamentos/propostas","orcamentos/produtos","orcamentos/regras","orcamentos/kit-regras",
    "painel-ia","configuracoes","configuracoes/usuarios"
  ];

  const rows = allKeys.map((k) => ({
    user_id: userId,
    menu_key: k,
    access_level: allowed.includes(k) ? "completo" : "nenhum",
  }));

  const { error: insErr } = await supabase.from("user_menu_overrides").insert(rows);

  return new Response(
    JSON.stringify({ ok: true, userId, insErr: insErr?.message }),
    { headers: { "Content-Type": "application/json" } }
  );
});
