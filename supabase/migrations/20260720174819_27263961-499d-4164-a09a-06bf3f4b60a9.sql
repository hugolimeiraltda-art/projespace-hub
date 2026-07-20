
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.abrir_chamados_renovacao_automatica()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_dias int;
BEGIN
  -- PCI (customer_portfolio)
  FOR r IN
    SELECT id AS customer_id, contrato, razao_social, data_termino, mensalidade
    FROM public.customer_portfolio
    WHERE data_termino IS NOT NULL
      AND data_termino BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.customer_chamados
      WHERE customer_id = r.customer_id
        AND assunto = 'Renovação Contratual'
        AND status IN ('em_andamento','aberto')
    ) THEN
      v_dias := (r.data_termino - CURRENT_DATE);
      INSERT INTO public.customer_chamados (customer_id, assunto, descricao, prioridade, status, created_by_name)
      VALUES (
        r.customer_id,
        'Renovação Contratual',
        'Chamado aberto automaticamente. Contrato ' || COALESCE(r.contrato,'') || ' (' || COALESCE(r.razao_social,'') || ') vence em ' || to_char(r.data_termino,'DD/MM/YYYY') || ' (' || v_dias || ' dias). Mensalidade atual: R$ ' || COALESCE(r.mensalidade::text,'-') || '.',
        'alta',
        'em_andamento',
        'Sistema (Automático)'
      );
    END IF;
  END LOOP;

  -- PPE (ppe_customers)
  FOR r IN
    SELECT id AS customer_id, contrato, razao_social, data_termino, mensalidade
    FROM public.ppe_customers
    WHERE data_termino IS NOT NULL
      AND data_termino BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.customer_chamados
      WHERE customer_id = r.customer_id
        AND assunto = 'Renovação Contratual'
        AND status IN ('em_andamento','aberto')
    ) THEN
      v_dias := (r.data_termino - CURRENT_DATE);
      INSERT INTO public.customer_chamados (customer_id, assunto, descricao, prioridade, status, created_by_name)
      VALUES (
        r.customer_id,
        'Renovação Contratual',
        'Chamado aberto automaticamente. Contrato ' || COALESCE(r.contrato,'') || ' (' || COALESCE(r.razao_social,'') || ') vence em ' || to_char(r.data_termino,'DD/MM/YYYY') || ' (' || v_dias || ' dias). Mensalidade atual: R$ ' || COALESCE(r.mensalidade::text,'-') || '.',
        'alta',
        'em_andamento',
        'Sistema (Automático)'
      );
    END IF;
  END LOOP;
END;
$$;

-- Remove agendamento antigo se existir e recria diário 07:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('abrir-chamados-renovacao-diario');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'abrir-chamados-renovacao-diario',
  '0 7 * * *',
  $$SELECT public.abrir_chamados_renovacao_automatica();$$
);

-- Executa agora para cobrir contratos já dentro da janela de 90 dias
SELECT public.abrir_chamados_renovacao_automatica();
