CREATE OR REPLACE FUNCTION public.validate_contrato_prefix()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.contrato IS NULL OR NEW.tipo_carteira IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow TEMP- placeholders for drafts
  IF NEW.contrato LIKE 'TEMP-%' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo_carteira = 'PPE' AND NEW.contrato NOT LIKE 'PPE%' THEN
    RAISE EXCEPTION 'Contratos PPE devem começar com "PPE". Valor inválido: %', NEW.contrato;
  END IF;

  IF NEW.tipo_carteira = 'PCI' AND NEW.contrato !~ '^(SP|PR|PD|PCI)' THEN
    RAISE EXCEPTION 'Contratos PCI devem começar com SP, PR, PD ou PCI. Valor inválido: %', NEW.contrato;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_contrato_prefix ON public.customer_portfolio;
CREATE TRIGGER trg_validate_contrato_prefix
BEFORE INSERT OR UPDATE OF contrato, tipo_carteira ON public.customer_portfolio
FOR EACH ROW
EXECUTE FUNCTION public.validate_contrato_prefix();