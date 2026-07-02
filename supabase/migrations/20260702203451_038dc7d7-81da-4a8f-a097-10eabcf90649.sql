UPDATE public.ppe_customers pc
SET contrato = 'PPE' || p.numero_projeto::text
FROM public.projects p
WHERE pc.project_id = p.id
  AND pc.contrato LIKE 'TEMP%'
  AND p.numero_projeto IS NOT NULL;