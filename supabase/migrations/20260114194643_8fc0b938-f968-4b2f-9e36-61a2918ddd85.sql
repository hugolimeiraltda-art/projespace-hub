-- Add taxa_ativacao column to customer_portfolio
ALTER TABLE public.customer_portfolio 
ADD COLUMN IF NOT EXISTS taxa_ativacao numeric DEFAULT NULL;

-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-documents', 
  'customer-documents', 
  false,
  52428800, -- 50MB max file size
  ARRAY['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Create table to store document metadata
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  tipo_arquivo text,
  tamanho bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on customer_documents
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_documents
CREATE POLICY "Admin, Projetos, Implantacao can view documents"
ON public.customer_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'projetos'::app_role) OR 
  has_role(auth.uid(), 'implantacao'::app_role)
);

CREATE POLICY "Admin and Implantacao can insert documents"
ON public.customer_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'implantacao'::app_role)
);

CREATE POLICY "Admin and Implantacao can delete documents"
ON public.customer_documents
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Storage policies for customer-documents bucket
CREATE POLICY "Admin, Projetos, Implantacao can view customer documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'customer-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'projetos'::app_role) OR 
    has_role(auth.uid(), 'implantacao'::app_role)
  )
);

CREATE POLICY "Admin and Implantacao can upload customer documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'customer-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'implantacao'::app_role)
  )
);

CREATE POLICY "Admin and Implantacao can delete customer documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'customer-documents' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'implantacao'::app_role)
  )
);