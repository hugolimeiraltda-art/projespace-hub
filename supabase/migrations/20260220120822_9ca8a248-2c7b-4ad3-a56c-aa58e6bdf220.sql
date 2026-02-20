
INSERT INTO public.orcamento_regras_precificacao (campo, percentual, base_campo, descricao)
VALUES 
  ('servico_valor_instalacao', 10, 'preco_unitario', 'Percentual do Valor Atual para calcular Valor Instalação de Serviços'),
  ('servico_valor_minimo_locacao', 90, 'valor_locacao', 'Percentual do Valor Locação para calcular Valor Mín. Locação de Serviços');
