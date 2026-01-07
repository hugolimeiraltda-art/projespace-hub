-- Adicionar novo role 'implantacao' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'implantacao';