INSERT INTO public.ppe_customers (contrato, razao_social, endereco, filial, project_id, sistema)
SELECT
  COALESCE(NULLIF(cp.contrato, ''), 'TEMP-PPE-' || p.numero_projeto::text) AS contrato,
  p.cliente_condominio_nome AS razao_social,
  COALESCE(p.endereco_condominio, NULLIF(TRIM(BOTH ', ' FROM CONCAT_WS(', ', p.cliente_cidade, p.cliente_estado)), '')) AS endereco,
  CASE UPPER(COALESCE(p.cliente_estado, ''))
    WHEN 'SP' THEN 'SPO'
    WHEN 'MG' THEN 'BHZ'
    WHEN 'ES' THEN 'VIX'
    WHEN 'RJ' THEN 'RJO'
    ELSE NULL
  END AS filial,
  p.id AS project_id,
  'EM_IMPLANTACAO' AS sistema
FROM public.projects p
LEFT JOIN public.customer_portfolio cp ON cp.project_id = p.id
LEFT JOIN public.ppe_customers pc ON pc.project_id = p.id
WHERE p.tipo_implantacao = 'PPE'
  AND p.sale_status = 'CONCLUIDO'
  AND (p.implantacao_status IS DISTINCT FROM 'CONCLUIDO_IMPLANTACAO')
  AND pc.id IS NULL;