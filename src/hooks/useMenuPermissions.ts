import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AccessLevel = 'completo' | 'visualizacao' | 'nenhum';

interface RolePermission {
  menu_key: string;
  access_level: AccessLevel;
}

interface UserOverride {
  menu_key: string;
  access_level: AccessLevel;
}

// All menu keys in the system
export const MENU_KEYS = [
  { key: 'dashboard', label: 'Dashboard', parent: null },
  { key: 'projetos', label: 'Projetos', parent: null },
  { key: 'projetos/novo', label: 'Novo Projeto', parent: 'projetos' },
  { key: 'projetos/informar-venda', label: 'Informar Nova Venda', parent: 'projetos' },
  { key: 'projetos/lista', label: 'Lista de Projetos', parent: 'projetos' },
  { key: 'implantacao', label: 'Implantação', parent: null },
  { key: 'controle-estoque', label: 'Controle de Estoque', parent: null },
  { key: 'manutencao', label: 'Manutenção', parent: null },
  { key: 'manutencao/preventivas', label: 'Agendas Preventivas', parent: 'manutencao' },
  { key: 'manutencao/chamados', label: 'Chamados', parent: 'manutencao' },
  { key: 'manutencao/pendencias', label: 'Controle de Pendências', parent: 'manutencao' },
  { key: 'carteira-clientes', label: 'Carteira de Clientes', parent: null },
  { key: 'sucesso-cliente', label: 'Sucesso do Cliente', parent: null },
  { key: 'orcamentos', label: 'Orçamentos IA', parent: null },
  { key: 'orcamentos/sessoes', label: 'Sessões', parent: 'orcamentos' },
  { key: 'orcamentos/propostas', label: 'Propostas Geradas', parent: 'orcamentos' },
  { key: 'orcamentos/produtos', label: 'Produtos e Kits', parent: 'orcamentos' },
  { key: 'orcamentos/regras', label: 'Regras de Preço', parent: 'orcamentos' },
  { key: 'orcamentos/kit-regras', label: 'Regras de Kits (IA)', parent: 'orcamentos' },
  { key: 'painel-ia', label: 'Painel de IA', parent: null },
  { key: 'configuracoes', label: 'Configurações', parent: null },
  { key: 'configuracoes/usuarios', label: 'Gestão de Usuários', parent: 'configuracoes' },
] as const;

export type MenuKey = typeof MENU_KEYS[number]['key'];

export function useMenuPermissions() {
  const { user } = useAuth();
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const load = async () => {
      const [{ data: rp }, { data: uo }] = await Promise.all([
        supabase.from('role_menu_permissions').select('menu_key, access_level').eq('role', user.role),
        supabase.from('user_menu_overrides').select('menu_key, access_level').eq('user_id', user.id),
      ]);
      setRolePerms((rp || []) as RolePermission[]);
      setUserOverrides((uo || []) as UserOverride[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const getAccess = useCallback((menuKey: string): AccessLevel => {
    // User override takes priority
    const override = userOverrides.find(o => o.menu_key === menuKey);
    if (override) return override.access_level;
    
    // Fall back to role permission
    const rolePerm = rolePerms.find(r => r.menu_key === menuKey);
    if (rolePerm) return rolePerm.access_level;
    
    // Default: admin gets completo, others get nenhum
    if (user?.role === 'admin') return 'completo';
    return 'nenhum';
  }, [rolePerms, userOverrides, user]);

  const canAccess = useCallback((menuKey: string): boolean => {
    return getAccess(menuKey) !== 'nenhum';
  }, [getAccess]);

  const isReadOnly = useCallback((menuKey: string): boolean => {
    return getAccess(menuKey) === 'visualizacao';
  }, [getAccess]);

  return { canAccess, isReadOnly, getAccess, loading };
}

// Admin hook to load all permissions for management
export function useAllPermissions() {
  const [rolePerms, setRolePerms] = useState<Array<{ role: string; menu_key: string; access_level: AccessLevel }>>([]);
  const [userOverrides, setUserOverrides] = useState<Array<{ id: string; user_id: string; menu_key: string; access_level: AccessLevel }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rp }, { data: uo }] = await Promise.all([
      supabase.from('role_menu_permissions').select('role, menu_key, access_level'),
      supabase.from('user_menu_overrides').select('id, user_id, menu_key, access_level'),
    ]);
    setRolePerms((rp || []) as any);
    setUserOverrides((uo || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRolePerm = async (role: string, menuKey: string, accessLevel: AccessLevel) => {
    const existing = rolePerms.find(r => r.role === role && r.menu_key === menuKey);
    if (existing) {
      if (accessLevel === 'nenhum') {
        await supabase.from('role_menu_permissions').delete().eq('role', role as any).eq('menu_key', menuKey);
      } else {
        await supabase.from('role_menu_permissions').update({ access_level: accessLevel } as any).eq('role', role as any).eq('menu_key', menuKey);
      }
    } else if (accessLevel !== 'nenhum') {
      await supabase.from('role_menu_permissions').insert({ role: role as any, menu_key: menuKey, access_level: accessLevel } as any);
    }
    await load();
  };

  const updateUserOverride = async (userId: string, menuKey: string, accessLevel: AccessLevel | null) => {
    if (accessLevel === null) {
      // Remove override
      await supabase.from('user_menu_overrides').delete().eq('user_id', userId).eq('menu_key', menuKey);
    } else {
      await supabase.from('user_menu_overrides').upsert(
        { user_id: userId, menu_key: menuKey, access_level: accessLevel },
        { onConflict: 'user_id,menu_key' }
      );
    }
    await load();
  };

  return { rolePerms, userOverrides, loading, updateRolePerm, updateUserOverride, reload: load };
}
