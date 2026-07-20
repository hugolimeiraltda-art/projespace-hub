
UPDATE public.customer_chamados SET status = 'em_andamento' WHERE status IN ('aberto');
UPDATE public.customer_chamados SET status = 'renovado' WHERE status IN ('resolvido');
