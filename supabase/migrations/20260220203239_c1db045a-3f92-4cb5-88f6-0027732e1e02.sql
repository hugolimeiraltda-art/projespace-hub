-- Add usage context columns to orcamento_kits
ALTER TABLE public.orcamento_kits
ADD COLUMN IF NOT EXISTS descricao_uso text,
ADD COLUMN IF NOT EXISTS palavras_chave text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS regras_condicionais jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.orcamento_kits.descricao_uso IS 'Descrição de quando e como usar este kit na proposta (ex: Usar quando o condomínio tem portão pivotante simples)';
COMMENT ON COLUMN public.orcamento_kits.palavras_chave IS 'Tags para match automático (ex: portão, pivotante, deslizante)';
COMMENT ON COLUMN public.orcamento_kits.regras_condicionais IS 'Regras condicionais para sugestão automática (ex: [{campo: "tipo_portao", valor: "pivotante", condicao: "igual"}])';