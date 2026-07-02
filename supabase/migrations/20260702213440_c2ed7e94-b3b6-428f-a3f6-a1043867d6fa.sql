
-- 1) Delete orphan draft portfolio rows (no project_id, placeholder name)
DELETE FROM public.customer_portfolio
WHERE contrato LIKE 'TEMP-%'
  AND project_id IS NULL;

DELETE FROM public.ppe_customers
WHERE contrato LIKE 'TEMP-%'
  AND project_id IS NULL;

-- 2) For customer_portfolio rows linked to a PPE project: move data into ppe_customers and remove from PCI portfolio
DO $$
DECLARE
  r RECORD;
  existing_id UUID;
BEGIN
  FOR r IN
    SELECT cp.id AS cp_id, cp.project_id, cp.contrato AS old_contrato, cp.razao_social, cp.endereco, cp.filial,
           p.numero_projeto
    FROM public.customer_portfolio cp
    JOIN public.projects p ON p.id = cp.project_id
    WHERE cp.contrato LIKE 'TEMP-%'
      AND p.tipo_implantacao = 'PPE'
  LOOP
    SELECT id INTO existing_id FROM public.ppe_customers WHERE project_id = r.project_id LIMIT 1;
    IF existing_id IS NULL THEN
      -- Ensure the PPE contract number is unique
      IF NOT EXISTS (SELECT 1 FROM public.ppe_customers WHERE contrato = 'PPE' || r.numero_projeto) THEN
        INSERT INTO public.ppe_customers (contrato, razao_social, endereco, filial, project_id, sistema)
        VALUES ('PPE' || r.numero_projeto, r.razao_social, r.endereco, r.filial, r.project_id, 'EM_IMPLANTACAO');
      END IF;
    END IF;
    DELETE FROM public.customer_portfolio WHERE id = r.cp_id;
  END LOOP;
END $$;

-- 3) For customer_portfolio rows linked to a PCI project: rename TEMP contract to PCI{numero_projeto}
UPDATE public.customer_portfolio cp
SET contrato = 'PCI' || p.numero_projeto,
    tipo_carteira = 'PCI'
FROM public.projects p
WHERE cp.project_id = p.id
  AND cp.contrato LIKE 'TEMP-%'
  AND (p.tipo_implantacao IS NULL OR p.tipo_implantacao = 'PCI')
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_portfolio cp2
    WHERE cp2.contrato = 'PCI' || p.numero_projeto AND cp2.id <> cp.id
  );
