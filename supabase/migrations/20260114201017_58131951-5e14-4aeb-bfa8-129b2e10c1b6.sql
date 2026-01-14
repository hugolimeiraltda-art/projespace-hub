-- Add address and contact fields to customer_portfolio
ALTER TABLE public.customer_portfolio
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS contato_telefone TEXT;