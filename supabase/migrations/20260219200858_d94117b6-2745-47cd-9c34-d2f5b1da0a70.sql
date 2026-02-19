
-- Add interfonia sub-option columns to tap_forms
ALTER TABLE public.tap_forms 
ADD COLUMN interfonia_tipo text,
ADD COLUMN interfonia_alternativa text;

-- interfonia_tipo: 'HIBRIDA', 'ANALOGICA', 'DIGITAL' (when interfonia = true)
-- interfonia_alternativa: 'VENDER_NOVA', 'NENHUMA' (when interfonia = false)
