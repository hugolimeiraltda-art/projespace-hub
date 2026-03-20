INSERT INTO public.role_menu_permissions (role, menu_key, access_level)
VALUES 
  ('supervisor_operacoes', 'implantacao', 'completo')
ON CONFLICT (role, menu_key) DO UPDATE SET access_level = 'completo';