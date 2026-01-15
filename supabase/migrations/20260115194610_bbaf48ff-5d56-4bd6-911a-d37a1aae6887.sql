-- Create stock location types enum
CREATE TYPE public.estoque_tipo AS ENUM ('INSTALACAO', 'MANUTENCAO', 'URGENCIA');

-- Create stock locations reference table
CREATE TABLE public.locais_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidade TEXT NOT NULL CHECK (cidade IN ('BH', 'VIX', 'RIO')),
    tipo estoque_tipo NOT NULL,
    nome_local TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (cidade, tipo)
);

-- Insert the 9 stock locations
INSERT INTO public.locais_estoque (cidade, tipo, nome_local) VALUES
    ('BH', 'INSTALACAO', 'BH - Instalação'),
    ('BH', 'MANUTENCAO', 'BH - Manutenção'),
    ('BH', 'URGENCIA', 'BH - Urgência'),
    ('VIX', 'INSTALACAO', 'VIX - Instalação'),
    ('VIX', 'MANUTENCAO', 'VIX - Manutenção'),
    ('VIX', 'URGENCIA', 'VIX - Urgência'),
    ('RIO', 'INSTALACAO', 'RIO - Instalação'),
    ('RIO', 'MANUTENCAO', 'RIO - Manutenção'),
    ('RIO', 'URGENCIA', 'RIO - Urgência');

-- Create items table for product catalog
CREATE TABLE public.estoque_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    modelo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock data table (one record per item per location)
CREATE TABLE public.estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
    local_estoque_id UUID NOT NULL REFERENCES public.locais_estoque(id) ON DELETE CASCADE,
    estoque_minimo INTEGER NOT NULL DEFAULT 0,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (item_id, local_estoque_id)
);

-- Create import history table
CREATE TABLE public.estoque_importacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arquivo_nome TEXT NOT NULL,
    itens_importados INTEGER NOT NULL DEFAULT 0,
    importado_por UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.locais_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_importacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admin and administrativo can view/manage stock

-- Locais Estoque - Read only for admin/administrativo
CREATE POLICY "Admin and Administrativo can view locais_estoque"
ON public.locais_estoque FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

-- Estoque Itens - CRUD for admin/administrativo
CREATE POLICY "Admin and Administrativo can view estoque_itens"
ON public.estoque_itens FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can insert estoque_itens"
ON public.estoque_itens FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can update estoque_itens"
ON public.estoque_itens FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can delete estoque_itens"
ON public.estoque_itens FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

-- Estoque - CRUD for admin/administrativo
CREATE POLICY "Admin and Administrativo can view estoque"
ON public.estoque FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can insert estoque"
ON public.estoque FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can update estoque"
ON public.estoque FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can delete estoque"
ON public.estoque FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

-- Importacoes - CRUD for admin/administrativo
CREATE POLICY "Admin and Administrativo can view estoque_importacoes"
ON public.estoque_importacoes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Admin and Administrativo can insert estoque_importacoes"
ON public.estoque_importacoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

-- Create trigger for updating updated_at
CREATE TRIGGER update_estoque_itens_updated_at
BEFORE UPDATE ON public.estoque_itens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estoque_updated_at
BEFORE UPDATE ON public.estoque
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();