-- Add app column to customer_portfolio
ALTER TABLE public.customer_portfolio
ADD COLUMN IF NOT EXISTS app TEXT;