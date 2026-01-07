-- Add new attachment types for project deliverables from engineering team
-- Add laudo_projeto column to projects table

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS laudo_projeto TEXT;

-- Add new attachment types to the enum
ALTER TYPE public.attachment_type ADD VALUE IF NOT EXISTS 'PLANTA_CROQUI_DEVOLUCAO';
ALTER TYPE public.attachment_type ADD VALUE IF NOT EXISTS 'LISTA_EQUIPAMENTOS';
ALTER TYPE public.attachment_type ADD VALUE IF NOT EXISTS 'LISTA_ATIVIDADES';