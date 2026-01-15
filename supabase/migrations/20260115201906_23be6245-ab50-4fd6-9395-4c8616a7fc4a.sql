-- Create stock alerts table for administrativo users
CREATE TABLE public.estoque_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  local_estoque_id UUID NOT NULL REFERENCES public.locais_estoque(id) ON DELETE CASCADE,
  estoque_minimo INTEGER NOT NULL,
  estoque_atual INTEGER NOT NULL,
  quantidade_faltante INTEGER NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  lido_por UUID REFERENCES auth.users(id),
  lido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, local_estoque_id)
);

-- Enable RLS
ALTER TABLE public.estoque_alertas ENABLE ROW LEVEL SECURITY;

-- Policies for administrativo and admin
CREATE POLICY "Admin and Administrativo can view alerts"
ON public.estoque_alertas FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can update alerts"
ON public.estoque_alertas FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can insert alerts"
ON public.estoque_alertas FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can delete alerts"
ON public.estoque_alertas FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

-- Create function to sync alerts with current stock levels
CREATE OR REPLACE FUNCTION public.sync_estoque_alertas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete alerts for items that are no longer critical
  DELETE FROM estoque_alertas ea
  WHERE EXISTS (
    SELECT 1 FROM estoque e
    WHERE e.item_id = ea.item_id 
    AND e.local_estoque_id = ea.local_estoque_id
    AND e.estoque_atual >= e.estoque_minimo
  );

  -- Insert or update alerts for critical items
  INSERT INTO estoque_alertas (item_id, local_estoque_id, estoque_minimo, estoque_atual, quantidade_faltante)
  SELECT 
    e.item_id,
    e.local_estoque_id,
    e.estoque_minimo,
    e.estoque_atual,
    e.estoque_minimo - e.estoque_atual
  FROM estoque e
  WHERE e.estoque_atual < e.estoque_minimo
  ON CONFLICT (item_id, local_estoque_id) 
  DO UPDATE SET
    estoque_minimo = EXCLUDED.estoque_minimo,
    estoque_atual = EXCLUDED.estoque_atual,
    quantidade_faltante = EXCLUDED.quantidade_faltante,
    lido = CASE 
      WHEN estoque_alertas.estoque_atual != EXCLUDED.estoque_atual THEN false 
      ELSE estoque_alertas.lido 
    END;
END;
$$;

-- Create trigger to sync alerts when estoque changes
CREATE OR REPLACE FUNCTION public.trigger_sync_estoque_alertas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM sync_estoque_alertas();
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_alertas_after_estoque_change
AFTER INSERT OR UPDATE OR DELETE ON public.estoque
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_estoque_alertas();