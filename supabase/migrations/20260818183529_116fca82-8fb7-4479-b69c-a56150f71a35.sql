ALTER TABLE public.customer_rede_equipamentos ADD COLUMN IF NOT EXISTS tipo_equipamento text;

CREATE TABLE IF NOT EXISTS public.rede_equipamento_tipos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rede_equipamento_tipos TO authenticated;
GRANT ALL ON public.rede_equipamento_tipos TO service_role;

ALTER TABLE public.rede_equipamento_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tipos" ON public.rede_equipamento_tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create tipos" ON public.rede_equipamento_tipos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update tipos" ON public.rede_equipamento_tipos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tipos" ON public.rede_equipamento_tipos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.rede_equipamento_tipos (nome) VALUES
  ('Leitor facial'),('DVR'),('Ata'),('TDMI'),('Camera IP'),('NVR'),('Modem'),('Roteador'),('Switch Gerenciável'),('Mikrotik'),('Mód Guarita'),('Mob Gate'),('PABX')
ON CONFLICT (nome) DO NOTHING;