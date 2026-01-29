
-- Remover a constraint antiga de cidade
ALTER TABLE locais_estoque DROP CONSTRAINT IF EXISTS locais_estoque_cidade_check;

-- Criar nova constraint com CD_SR
ALTER TABLE locais_estoque ADD CONSTRAINT locais_estoque_cidade_check CHECK (cidade IN ('BH', 'VIX', 'RIO', 'CD_SR'));
