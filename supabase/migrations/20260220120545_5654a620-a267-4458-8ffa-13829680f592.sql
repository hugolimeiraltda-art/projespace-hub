
-- Insert service pricing rules (only 2: valor_minimo and valor_locacao)
INSERT INTO public.orcamento_regras_precificacao (campo, percentual, base_campo, descricao)
VALUES 
  ('servico_valor_minimo', 90, 'preco_unitario', 'Percentual do Valor Atual para calcular Valor Mínimo de Serviços'),
  ('servico_valor_locacao', 3.57, 'preco_unitario', 'Percentual do Valor Atual para calcular Valor Locação de Serviços');
