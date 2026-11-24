CREATE OR REPLACE FUNCTION public.prevent_self_filial_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.filial IS DISTINCT FROM OLD.filial OR NEW.filiais IS DISTINCT FROM OLD.filiais THEN
      RAISE EXCEPTION 'Somente administradores podem alterar a filial.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_self_filial_change ON public.profiles;
CREATE TRIGGER trg_prevent_self_filial_change BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_filial_change();