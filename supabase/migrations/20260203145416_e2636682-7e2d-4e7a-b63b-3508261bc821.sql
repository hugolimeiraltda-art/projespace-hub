-- Add columns for facial recognition devices by brand
ALTER TABLE public.customer_portfolio
ADD COLUMN IF NOT EXISTS faciais_hik integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS faciais_avicam integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS faciais_outros integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.customer_portfolio.faciais_hik IS 'Quantidade de faciais Hikvision';
COMMENT ON COLUMN public.customer_portfolio.faciais_avicam IS 'Quantidade de faciais Avicam';
COMMENT ON COLUMN public.customer_portfolio.faciais_outros IS 'Quantidade de faciais de outras marcas';