-- Add RETORNAR status to engineering_status enum
ALTER TYPE public.engineering_status ADD VALUE IF NOT EXISTS 'RETORNAR';