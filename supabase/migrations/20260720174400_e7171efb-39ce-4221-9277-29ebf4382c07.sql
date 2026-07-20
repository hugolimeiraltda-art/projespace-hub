
ALTER TABLE public.customer_chamados
  ADD COLUMN IF NOT EXISTS novo_valor_mensalidade numeric(12,2),
  ADD COLUMN IF NOT EXISTS novo_valor_vigencia date,
  ADD COLUMN IF NOT EXISTS nova_data_vencimento date,
  ADD COLUMN IF NOT EXISTS recursos_renovacao text[] NOT NULL DEFAULT '{}'::text[];
