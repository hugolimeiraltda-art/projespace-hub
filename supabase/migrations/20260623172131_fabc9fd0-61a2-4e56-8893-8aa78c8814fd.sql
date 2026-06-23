
ALTER TABLE public.implantacao_checklists
  ADD COLUMN IF NOT EXISTS public_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS external_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_submitted_by_name text,
  ADD COLUMN IF NOT EXISTS external_submitted_by_phone text;

UPDATE public.implantacao_checklists SET public_token = gen_random_uuid() WHERE public_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_implantacao_checklists_public_token ON public.implantacao_checklists(public_token);
