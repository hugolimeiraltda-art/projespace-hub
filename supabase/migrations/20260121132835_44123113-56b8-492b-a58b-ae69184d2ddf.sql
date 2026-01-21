-- Add column for sucesso_cliente comments on manutencao_pendencias
ALTER TABLE public.manutencao_pendencias 
ADD COLUMN IF NOT EXISTS comentario_sucesso_cliente TEXT,
ADD COLUMN IF NOT EXISTS comentario_sucesso_cliente_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comentario_sucesso_cliente_by TEXT;