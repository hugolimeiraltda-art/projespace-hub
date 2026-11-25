CREATE OR REPLACE FUNCTION public.eap_notify_eixonoc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_pid uuid := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
  UPDATE public.customer_portfolio SET updated_at = now() WHERE project_id = v_pid;
  BEGIN
    PERFORM net.http_post(
      url := 'https://qrjroshuyvuftuyrwqnl.supabase.co/functions/v1/pci-sync',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"force":true}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_eap_notify_eixonoc ON public.implantacao_eap_ambientes;
CREATE TRIGGER trg_eap_notify_eixonoc
AFTER INSERT OR UPDATE OR DELETE ON public.implantacao_eap_ambientes
FOR EACH ROW EXECUTE FUNCTION public.eap_notify_eixonoc();