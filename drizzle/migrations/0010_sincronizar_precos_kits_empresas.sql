CREATE OR REPLACE FUNCTION public.recalcular_kit_precos_empresa(_kit_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orcamento_kits k SET
    preco_kit = t.venda_emive,
    valor_locacao = t.locacao_emive,
    valor_instalacao = t.instalacao_emive,
    valor_venda_graber = CASE WHEN t.total = t.vendas_graber THEN t.venda_graber ELSE NULL END,
    valor_locacao_graber = CASE WHEN t.total = t.locacoes_graber THEN t.locacao_graber ELSE NULL END
  FROM (SELECT count(*) AS total, count(p.valor_venda_graber) AS vendas_graber, count(p.valor_locacao_graber) AS locacoes_graber,
    COALESCE(sum(p.preco_unitario*i.quantidade),0) AS venda_emive, COALESCE(sum(p.valor_locacao*i.quantidade),0) AS locacao_emive,
    COALESCE(sum(p.valor_instalacao*i.quantidade),0) AS instalacao_emive, sum(p.valor_venda_graber*i.quantidade) AS venda_graber,
    sum(p.valor_locacao_graber*i.quantidade) AS locacao_graber
    FROM public.orcamento_kit_itens i LEFT JOIN public.orcamento_produtos p ON p.id=i.produto_id WHERE i.kit_id=_kit_id) t
  WHERE k.id=_kit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.recalcular_kit_precos_empresa(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.sincronizar_kits_precos_empresa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE kid uuid;
BEGIN
  IF TG_TABLE_NAME='orcamento_produtos' THEN
    FOR kid IN SELECT DISTINCT kit_id FROM public.orcamento_kit_itens WHERE produto_id=NEW.id LOOP
      PERFORM public.recalcular_kit_precos_empresa(kid);
    END LOOP;
  ELSE
    IF TG_OP IN ('DELETE','UPDATE') THEN PERFORM public.recalcular_kit_precos_empresa(OLD.kit_id); END IF;
    IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.recalcular_kit_precos_empresa(NEW.kit_id); END IF;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sincronizar_kits_precos_empresa() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER produtos_sincronizar_precos_empresa AFTER UPDATE OF preco_unitario, valor_locacao, valor_instalacao, valor_venda_graber, valor_locacao_graber ON public.orcamento_produtos FOR EACH ROW EXECUTE FUNCTION public.sincronizar_kits_precos_empresa();
CREATE TRIGGER kit_itens_sincronizar_precos_empresa AFTER INSERT OR UPDATE OR DELETE ON public.orcamento_kit_itens FOR EACH ROW EXECUTE FUNCTION public.sincronizar_kits_precos_empresa();