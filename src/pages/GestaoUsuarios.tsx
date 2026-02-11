import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth, User, UserRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Pencil, Trash2, KeyRound, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const FILIAIS = [
  { id: 'belo-horizonte', nome: 'Belo Horizonte - MG' },
  { id: 'vitoria', nome: 'Vitória - ES' },
  { id: 'rio-de-janeiro', nome: 'Rio de Janeiro - RJ' },
  { id: 'sao-paulo', nome: 'São Paulo - SP' },
];

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'projetos', label: 'Projetista' },
  { value: 'implantacao', label: 'Implantação' },
  { value: 'gerente_comercial', label: 'Gerente Comercial' },
  { value: 'sucesso_cliente', label: 'Sucesso do Cliente' },
  { value: 'supervisor_operacoes', label: 'Supervisor de Operações' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'admin', label: 'Administrador' },
];

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'projetos':
      return 'default';
    case 'implantacao':
      return 'default';
    case 'sucesso_cliente':
      return 'default';
    case 'supervisor_operacoes':
      return 'default';
    case 'gerente_comercial':
      return 'outline';
    case 'vendedor':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function GestaoUsuarios() {
  const { user: currentUser, getAllUsers, addUser, updateUser, deleteUser, resetPassword } = useAuth();
  const { toast } = useToast();

  // Gerente comercial can only create vendedor users
  // Administrativo can create all except admin
  // Sucesso cliente can only create sucesso_cliente users
  const isGerenteComercial = currentUser?.role === 'gerente_comercial';
  const isAdministrativo = currentUser?.role === 'administrativo';
  const isSucessoCliente = currentUser?.role === 'sucesso_cliente';
  const availableRoles = isGerenteComercial 
    ? ALL_ROLES.filter(r => r.value === 'vendedor')
    : isAdministrativo
    ? ALL_ROLES.filter(r => r.value !== 'admin')
    : isSucessoCliente
    ? ALL_ROLES.filter(r => r.value === 'sucesso_cliente')
    : ALL_ROLES;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'vendedor' as UserRole,
    filial: '',
    filiais: [] as string[],
    telefone: '',
  });
  const [formError, setFormError] = useState('');

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const fetchedUsers = await getAllUsers();
    setUsers(fetchedUsers);
    setIsLoadingUsers(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      password: '123456',
      role: isGerenteComercial ? 'vendedor' : 'vendedor',
      filial: '',
      filiais: [],
      telefone: '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      password: '',
      role: user.role,
      filial: user.filial || '',
      filiais: user.filiais || [],
      telefone: user.telefone || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nome.trim() || !formData.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('E-mail inválido');
      return;
    }

    // Check for duplicate email (except when editing the same user)
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser?.id
    );
    if (existingUser) {
      setFormError('Já existe um usuário com este e-mail');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

  setIsSubmitting(true);
    try {
      if (editingUser) {
        const result = await updateUser(editingUser.id, {
          nome: formData.nome,
          role: formData.role,
          filial: formData.role !== 'gerente_comercial' ? (formData.filial || undefined) : undefined,
          filiais: formData.role === 'gerente_comercial' ? formData.filiais : undefined,
          telefone: formData.telefone || undefined,
        });
        if (result.success) {
          toast({
            title: 'Sucesso',
            description: 'Usuário atualizado com sucesso!',
          });
          setIsDialogOpen(false);
          loadUsers();
        } else {
          setFormError(result.error || 'Erro ao atualizar usuário');
        }
      } else {
        const result = await addUser({
          nome: formData.nome,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          filial: formData.role !== 'gerente_comercial' ? (formData.filial || undefined) : undefined,
          filiais: formData.role === 'gerente_comercial' ? formData.filiais : undefined,
          telefone: formData.telefone || undefined,
        });
        if (result.success) {
          toast({
            title: 'Sucesso',
            description: 'Usuário criado com sucesso!',
          });
          setIsDialogOpen(false);
          loadUsers();
        } else {
          setFormError(result.error || 'Erro ao criar usuário');
        }
      }
    } catch {
      setFormError('Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode excluir seu próprio usuário',
        variant: 'destructive',
      });
      return;
    }

    const result = await deleteUser(userId);
    if (result.success) {
      toast({
        title: 'Sucesso',
        description: 'Usuário removido com sucesso!',
      });
      loadUsers();
    } else {
      toast({
        title: 'Erro',
        description: result.error || 'Erro ao remover usuário',
        variant: 'destructive',
      });
    }
  };

  const openPasswordDialog = (userId: string) => {
    setPasswordUserId(userId);
    setNewPassword('123456');
    setShowPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!passwordUserId || !newPassword) return;

    if (newPassword.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 8 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)) {
      toast({
        title: 'Erro',
        description: 'A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (!@#$%^&*)',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(passwordUserId, newPassword);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso!',
      });
      setShowPasswordDialog(false);
      setPasswordUserId(null);
      setNewPassword('');
    } else {
      toast({
        title: 'Erro',
        description: result.error || 'Erro ao resetar senha',
        variant: 'destructive',
      });
    }
  };

  const getFilialName = (filialId?: string) => {
    if (!filialId) return '-';
    return FILIAIS.find((f) => f.id === filialId)?.nome || filialId;
  };

  const getFiliaisNames = (filiais?: string[]) => {
    if (!filiais || filiais.length === 0) return '-';
    return filiais.map(f => FILIAIS.find(fil => fil.id === f)?.nome || f).join(', ');
  };

  const toggleFilial = (filialId: string) => {
    setFormData(prev => ({
      ...prev,
      filiais: prev.filiais.includes(filialId)
        ? prev.filiais.filter(f => f !== filialId)
        : [...prev.filiais, filialId]
    }));
  };

  if (isLoadingUsers) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <Link
            to="/configuracoes"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para Configurações
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
              <p className="text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-card mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários ({filteredUsers.length})
            </CardTitle>
            <CardDescription>Lista de todos os usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">E-mail</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Perfil</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Filial</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                            {u.foto ? (
                              <img src={u.foto} alt={u.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium text-secondary-foreground">
                                {u.nome.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-foreground">{u.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                          {ALL_ROLES.find((r) => r.value === u.role)?.label || u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {u.role === 'gerente_comercial' ? getFiliaisNames(u.filiais) : getFilialName(u.filial)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(u.id)}
                            title="Alterar senha"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Excluir"
                                disabled={u.id === currentUser?.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário <strong>{u.nome}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(u.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Atualize as informações do usuário'
                  : 'Preencha os dados para criar um novo usuário.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{formError}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Inicial *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole, filiais: [], filial: '' })}
                  disabled={isGerenteComercial}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role === 'gerente_comercial' && (
                <div className="space-y-2">
                  <Label>Filiais Responsáveis *</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    {FILIAIS.map((f) => (
                      <div key={f.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filial-${f.id}`}
                          checked={formData.filiais.includes(f.id)}
                          onCheckedChange={() => toggleFilial(f.id)}
                        />
                        <label
                          htmlFor={`filial-${f.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {f.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.role === 'vendedor' && (
                <div className="space-y-2">
                  <Label htmlFor="filial">Filial</Label>
                  <Select
                    value={formData.filial}
                    onValueChange={(value) => setFormData({ ...formData, filial: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILIAIS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
              <DialogDescription>
                Digite a nova senha para o usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mín. 8 chars, maiúsc., minúsc., número, especial"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleResetPassword} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Alterar Senha
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
