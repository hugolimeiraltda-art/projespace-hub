
-- Add field for vendor to report modifications between engineering project and final deal
ALTER TABLE public.sale_forms 
ADD COLUMN modificacoes_projeto_final text;
