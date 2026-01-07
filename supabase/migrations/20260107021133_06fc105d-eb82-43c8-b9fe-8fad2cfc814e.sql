-- Add sequential numeric ID to projects
ALTER TABLE public.projects
ADD COLUMN numero_projeto SERIAL;

-- Create index for faster lookups
CREATE INDEX idx_projects_numero ON public.projects(numero_projeto);

-- Add a column to track original values before resubmission for change highlighting
ALTER TABLE public.projects
ADD COLUMN dados_originais_pre_reenvio JSONB DEFAULT NULL;