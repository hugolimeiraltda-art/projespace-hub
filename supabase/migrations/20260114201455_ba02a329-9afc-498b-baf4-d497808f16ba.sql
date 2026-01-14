-- Add numero_unidades to tap_forms table
ALTER TABLE public.tap_forms
ADD COLUMN IF NOT EXISTS numero_unidades INTEGER,
ADD COLUMN IF NOT EXISTS modalidade_portaria TEXT,
ADD COLUMN IF NOT EXISTS interfonia_descricao TEXT;

-- Add numero_unidades to projects table for easier access
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS numero_unidades INTEGER;