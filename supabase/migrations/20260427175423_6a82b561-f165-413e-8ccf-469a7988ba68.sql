ALTER TABLE public.customer_portfolio
ADD COLUMN IF NOT EXISTS tipo_carteira TEXT NOT NULL DEFAULT 'PCI';

UPDATE public.customer_portfolio
SET tipo_carteira = 'PCI'
WHERE tipo_carteira IS NULL OR tipo_carteira = '';

CREATE INDEX IF NOT EXISTS idx_customer_portfolio_tipo_carteira
ON public.customer_portfolio (tipo_carteira);

COMMENT ON COLUMN public.customer_portfolio.tipo_carteira IS 'Separação da carteira de clientes entre PCI e PPE';