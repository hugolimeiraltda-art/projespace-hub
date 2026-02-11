
-- Create table for storing file attachments per section of the sale form
CREATE TABLE public.sale_form_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  secao TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.sale_form_attachments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all attachments
CREATE POLICY "Authenticated users can view sale form attachments"
ON public.sale_form_attachments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert attachments
CREATE POLICY "Authenticated users can insert sale form attachments"
ON public.sale_form_attachments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can delete their own attachments
CREATE POLICY "Authenticated users can delete sale form attachments"
ON public.sale_form_attachments FOR DELETE
USING (auth.uid() IS NOT NULL);
