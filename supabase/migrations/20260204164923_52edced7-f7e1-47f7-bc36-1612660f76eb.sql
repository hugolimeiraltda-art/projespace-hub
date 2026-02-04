-- Create enum for administrator types
CREATE TYPE administrador_tipo AS ENUM (
  'sindico_profissional',
  'sindico_organico',
  'subsindico',
  'conselheiro',
  'zelador',
  'administradora'
);

-- Create table for condominium administrators
CREATE TABLE public.customer_administradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  tipo administrador_tipo NOT NULL,
  
  -- Common fields for all types
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_aniversario DATE,
  
  -- Fields for sindico/subsindico/conselheiro
  data_validade_mandato DATE,
  numero_apto TEXT,
  numero_bloco TEXT,
  
  -- Fields for zelador
  horario_trabalho JSONB, -- Array of {dia: string, inicio: string, fim: string}
  atende_celular BOOLEAN DEFAULT false,
  
  -- Fields for administradora
  razao_social TEXT,
  endereco TEXT,
  nome_responsavel TEXT,
  
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_administradores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can manage administradores"
ON public.customer_administradores
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can manage administradores"
ON public.customer_administradores
FOR ALL
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Sucesso Cliente can view administradores"
ON public.customer_administradores
FOR SELECT
USING (has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Projetos can view administradores"
ON public.customer_administradores
FOR SELECT
USING (has_role(auth.uid(), 'projetos'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_customer_administradores_customer_id ON public.customer_administradores(customer_id);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_administradores_updated_at
BEFORE UPDATE ON public.customer_administradores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();