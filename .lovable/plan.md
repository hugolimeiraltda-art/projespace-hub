## Objetivo
Brenda (`brenda.morais@emive.com.br`) precisa atuar como **vendedora** (criar/editar projetos próprios, informar venda) **e** como **sucesso do cliente** (já é seu role atual), sem virar admin e sem afetar outros usuários.

## Abordagem
Manter o `role = sucesso_cliente` e introduzir um **data scope exclusivo** chamado `vendedor_plus`. Esse scope é concedido só pra ela e referenciado nas policies que hoje exigem o role `vendedor` para gravação. Assim a mudança é cirúrgica — só ela ganha o acesso extra.

## Passos

1. **Liberar os menus de vendedor pra ela**
   Hoje os overrides dela em `user_menu_overrides` zeram `projetos/novo` e `projetos/informar-venda`. Remover esses dois overrides e adicionar `completo` em `projetos/lista`. Os menus de Sucesso do Cliente continuam como estão.

2. **Conceder o scope `vendedor_plus`**
   Inserir uma linha em `user_data_scopes` (`user_id = Brenda`, `scope_key = vendedor_plus`).

3. **Migration de RLS — estender policies de escrita para reconhecer o scope**
   Nas tabelas onde a gravação hoje é restrita por role, adicionar a cláusula `OR has_data_scope(auth.uid(), 'vendedor_plus')` (sempre mantendo a verificação de "dono do projeto" quando aplicável):
   - `projects` — UPDATE: permitir quando dona do projeto + scope
   - `sale_forms` — INSERT/UPDATE: permitir quando vinculada a projeto dela + scope
   - `tap_forms` — INSERT/UPDATE: mesma regra
   - `project_attachments` — INSERT/DELETE: dona + scope
   - `sale_form_attachments` — INSERT/DELETE: dona + scope
   - `sale_validations` — INSERT/UPDATE: quando dona do projeto + scope

4. **Verificação**
   Após aplicar, conferir no banco:
   - `select * from user_data_scopes where user_id = Brenda` retorna `vendedor_plus`
   - Policies novas presentes via `pg_policies`
   - Brenda consegue ver "Novo Projeto" e "Informar Nova Venda" no menu

## Detalhes técnicos
- Nenhuma policy existente é removida — só são adicionadas cláusulas `OR` para o novo scope. Sem impacto em outros usuários.
- Tabelas de Sucesso do Cliente (`customer_*`, `clientes_inativos`, `customer_nps`, etc.) não mudam — o role `sucesso_cliente` dela já cobre.
- Caso outro usuário precise no futuro do mesmo combo, basta inserir uma linha em `user_data_scopes` — sem nova migration.

## Fora de escopo
- Não alteramos role nem promovemos a admin.
- Não criamos novo role no enum `app_role`.
- Não mexemos em tabelas de Sucesso do Cliente.