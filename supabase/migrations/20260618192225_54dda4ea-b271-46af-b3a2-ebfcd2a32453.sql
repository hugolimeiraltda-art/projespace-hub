ALTER TABLE public.clientes_inativos
  ADD COLUMN IF NOT EXISTS cod_sp text,
  ADD COLUMN IF NOT EXISTS mensalidade numeric,
  ADD COLUMN IF NOT EXISTS data_termino date;