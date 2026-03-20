
ALTER TABLE public.implantacao_planejamento_ativacoes 
ADD COLUMN praca text DEFAULT 'GERAL';

-- Drop old unique constraint on (mes, ano) and create new one on (mes, ano, praca)
ALTER TABLE public.implantacao_planejamento_ativacoes 
DROP CONSTRAINT IF EXISTS implantacao_planejamento_ativacoes_mes_ano_key;

ALTER TABLE public.implantacao_planejamento_ativacoes 
ADD CONSTRAINT implantacao_planejamento_ativacoes_mes_ano_praca_key UNIQUE (mes, ano, praca);
