-- Add new role 'supervisor_operacoes' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_operacoes';