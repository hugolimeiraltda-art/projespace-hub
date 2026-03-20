-- Update prazo_entrega_projeto to 2026-03-14 for all 4 projects
UPDATE projects SET prazo_entrega_projeto = '2026-03-14'
WHERE id IN (
  'ceecc83d-b91d-4610-9416-b7794712dc64', -- Pilar
  '95a6362e-d329-40f0-896f-44294365ff09', -- Ecoville
  'a055cc7b-a4d3-4b98-b25d-62bdea4a672d', -- Malibu
  '15494812-12d9-4013-8087-39947dc38d47'  -- Monte Carlo
);

-- Clear incorrect data_ativacao for Monte Carlo (still in implantation)
UPDATE customer_portfolio SET data_ativacao = NULL
WHERE contrato = 'SP84' AND status_implantacao = 'EM_IMPLANTACAO';