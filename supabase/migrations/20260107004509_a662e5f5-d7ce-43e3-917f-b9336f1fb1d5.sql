-- Add gerente_comercial to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente_comercial';

-- Add filiais array column to profiles for gerente_comercial
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS filiais text[] DEFAULT NULL;