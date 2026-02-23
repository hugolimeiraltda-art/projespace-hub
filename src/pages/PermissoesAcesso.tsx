import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAllPermissions, MENU_KEYS, AccessLevel } from '@/hooks/useMenuPermissions';
import { ArrowLeft, Shield, UserCog, Check, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'projetos', label: 'Projetista' },
  { value: 'implantacao', label: 'Implantação' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'sucesso_cliente', label: 'Sucesso do Cliente' },
  { value: 'supervisor_operacoes', label: 'Supervisor de Operações' },
  { value: 'gerente_comercial', label: 'Gerente Comercial' },
];

const ACCESS_OPTIONS: { value: AccessLevel; label: string; icon: typeof Check; color: string }[] = [
  { value: 'completo', label: 'Completo', icon: Check, color: 'text-green-600' },
  { value: 'visualizacao', label: 'Visualização', icon: Eye, color: 'text-amber-600' },
  { value: 'nenhum', label: 'Sem acesso', icon: X, color: 'text-destructive' },
];

interface UserWithRole {
  id: string;
  nome: string;
  email: string;
  role: string;
}

export default function PermissoesAcesso() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { rolePerms, userOverrides, loading, updateRolePerm, updateUserOverride, reload } = useAllPermissions();
  const [selectedRole, setSelectedRole] = useState('vendedor');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (!roles) return;
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, nome, email').in('id', userIds);
      if (!profiles) return;
      setUsers(profiles.map(p => ({
        ...p,
        role: (roles.find(r => r.user_id === p.id)?.role || 'vendedor') as string,
      })));
    };
    loadUsers();
  }, []);

  if (user?.role !== 'admin') {
    return <Layout><div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div></Layout>;
  }

  const getRoleAccess = (role: string, menuKey: string): AccessLevel => {
    const perm = rolePerms.find(r => r.role === role && r.menu_key === menuKey);
    return (perm?.access_level as AccessLevel) || 'nenhum';
  };

  const getUserOverride = (userId: string, menuKey: string): AccessLevel | null => {
    const override = userOverrides.find(o => o.user_id === userId && o.menu_key === menuKey);
    return override ? override.access_level as AccessLevel : null;
  };

  const handleRoleChange = async (role: string, menuKey: string, level: AccessLevel) => {
    setSaving(true);
    await updateRolePerm(role, menuKey, level);
    toast({ title: 'Permissão atualizada' });
    setSaving(false);
  };

  const handleUserOverrideChange = async (userId: string, menuKey: string, level: AccessLevel | null) => {
    setSaving(true);
    await updateUserOverride(userId, menuKey, level);
    toast({ title: level === null ? 'Exceção removida' : 'Exceção aplicada' });
    setSaving(false);
  };

  const parentMenus = MENU_KEYS.filter(m => m.parent === null);
  const getChildren = (parentKey: string) => MENU_KEYS.filter(m => m.parent === parentKey);

  const AccessCell = ({ value, onChange, disabled }: { value: AccessLevel; onChange: (v: AccessLevel) => void; disabled?: boolean }) => (
    <div className="flex gap-1">
      {ACCESS_OPTIONS.map(opt => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            title={opt.label}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center transition-all border',
              isActive
                ? opt.value === 'completo' ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700'
                : opt.value === 'visualizacao' ? 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
                : 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700'
                : 'border-border hover:bg-accent',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive ? opt.color : 'text-muted-foreground')} />
          </button>
        );
      })}
    </div>
  );

  const selectedUserObj = users.find(u => u.id === selectedUser);

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/configuracoes">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perfis de Acesso</h1>
            <p className="text-muted-foreground">Gerencie permissões de menu por perfil e por usuário</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-sm">
          {ACCESS_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <div key={opt.value} className="flex items-center gap-1.5">
                <Icon className={cn('w-4 h-4', opt.color)} />
                <span className="text-muted-foreground">{opt.label}</span>
              </div>
            );
          })}
        </div>

        <Tabs defaultValue="roles">
          <TabsList className="h-12 rounded-xl">
            <TabsTrigger value="roles" className="h-10 rounded-lg gap-2">
              <Shield className="w-4 h-4" />Permissões por Perfil
            </TabsTrigger>
            <TabsTrigger value="users" className="h-10 rounded-lg gap-2">
              <UserCog className="w-4 h-4" />Exceções por Usuário
            </TabsTrigger>
          </TabsList>

          {/* Role Permissions Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Perfil:</span>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium w-[300px]">Menu</th>
                        <th className="text-center py-3 px-4 font-medium">Nível de Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentMenus.map(menu => {
                        const children = getChildren(menu.key);
                        const access = getRoleAccess(selectedRole, menu.key);
                        return (
                          <> 
                            <tr key={menu.key} className="border-b bg-card">
                              <td className="py-3 px-4 font-semibold text-foreground">{menu.label}</td>
                              <td className="py-3 px-4">
                                <div className="flex justify-center">
                                  <AccessCell
                                    value={access}
                                    onChange={(v) => handleRoleChange(selectedRole, menu.key, v)}
                                    disabled={saving || selectedRole === 'admin'}
                                  />
                                </div>
                              </td>
                            </tr>
                            {children.map(child => {
                              const childAccess = getRoleAccess(selectedRole, child.key);
                              return (
                                <tr key={child.key} className="border-b">
                                  <td className="py-2.5 px-4 pl-10 text-muted-foreground">{child.label}</td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex justify-center">
                                      <AccessCell
                                        value={childAccess}
                                        onChange={(v) => handleRoleChange(selectedRole, child.key, v)}
                                        disabled={saving || selectedRole === 'admin'}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Overrides Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Usuário:</span>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                <SelectContent>
                  {users.sort((a, b) => a.nome.localeCompare(b.nome)).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserObj && (
                <Badge variant="secondary">{ROLES.find(r => r.value === selectedUserObj.role)?.label || selectedUserObj.role}</Badge>
              )}
            </div>

            {selectedUser ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Exceções sobrescrevem a permissão do perfil. Deixe sem seleção para usar o padrão do perfil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium w-[300px]">Menu</th>
                          <th className="text-center py-3 px-4 font-medium w-[120px]">Perfil</th>
                          <th className="text-center py-3 px-4 font-medium">Exceção</th>
                          <th className="text-center py-3 px-4 font-medium w-[100px]">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parentMenus.map(menu => {
                          const children = getChildren(menu.key);
                          const roleAccess = getRoleAccess(selectedUserObj?.role || '', menu.key);
                          const userOverride = getUserOverride(selectedUser, menu.key);

                          const renderRow = (m: typeof menu, isChild: boolean) => {
                            const ra = isChild ? getRoleAccess(selectedUserObj?.role || '', m.key) : roleAccess;
                            const uo = isChild ? getUserOverride(selectedUser, m.key) : userOverride;
                            const raOpt = ACCESS_OPTIONS.find(o => o.value === ra)!;
                            const RaIcon = raOpt.icon;

                            return (
                              <tr key={m.key} className={cn("border-b", !isChild && "bg-card")}>
                                <td className={cn("py-2.5 px-4", isChild ? "pl-10 text-muted-foreground" : "font-semibold text-foreground")}>
                                  {m.label}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <RaIcon className={cn('w-3.5 h-3.5', raOpt.color)} />
                                    <span className="text-xs text-muted-foreground">{raOpt.label}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex justify-center">
                                    <AccessCell
                                      value={uo || ra}
                                      onChange={(v) => handleUserOverrideChange(selectedUser, m.key, v)}
                                      disabled={saving}
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {uo !== null && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-destructive"
                                      onClick={() => handleUserOverrideChange(selectedUser, m.key, null)}
                                    >
                                      Remover
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          };

                          return (
                            <> 
                              {renderRow(menu, false)}
                              {children.map(child => renderRow(child, true))}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um usuário para gerenciar exceções de permissão.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
