-- Add QUADRIMESTRAL to recorrencia_frequencia enum
ALTER TYPE public.recorrencia_frequencia ADD VALUE IF NOT EXISTS 'QUADRIMESTRAL' AFTER 'TRIMESTRAL';