import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/types/project';
import { Users, Plus, Pencil, Trash2, KeyRound, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const FILIAIS = [
  { id: 'belo-horizonte', nome: 'Belo Horizonte - MG' },
  { id: 'vitoria', nome: 'Vitória - ES' },
  { id: 'rio-de-janeiro', nome: 'Rio de Janeiro - RJ' },
  { id: 'sao-paulo', nome: 'São Paulo - SP' },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'projetos', label: 'Projetista' },
  { value: 'admin', label: 'Administrador' },
];

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'projetos':
      return 'default';
    case 'vendedor':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function GestaoUsuarios() {
  const { user: currentUser, getAllUsers, addUser, updateUser, deleteUser, resetPassword } = useAuth();
  const { toast } = useToast();
  const users = getAllUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'vendedor' as UserRole,
    filial: '',
    telefone: '',
  });
  const [formError, setFormError] = useState('');

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
      role: 'vendedor',
      filial: '',
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
      role: user.role,
      filial: user.filial || '',
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

    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso!',
        });
      } else {
        await addUser(formData);
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso! Senha inicial: 123456',
        });
      }
      setIsDialogOpen(false);
    } catch {
      setFormError('Erro ao salvar usuário');
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

    try {
      await deleteUser(userId);
      toast({
        title: 'Sucesso',
        description: 'Usuário removido com sucesso!',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao remover usuário',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await resetPassword(userId);
      toast({
        title: 'Sucesso',
        description: 'Senha resetada para 123456. O usuário deverá alterá-la no próximo login.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao resetar senha',
        variant: 'destructive',
      });
    }
  };

  const getFilialName = (filialId?: string) => {
    if (!filialId) return '-';
    return FILIAIS.find((f) => f.id === filialId)?.nome || filialId;
  };

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
                  {ROLES.map((role) => (
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
                          {ROLES.find((r) => r.value === u.role)?.label || u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{getFilialName(u.filial)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(u.id)}
                            title="Resetar senha"
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
                  : 'Preencha os dados para criar um novo usuário. A senha inicial será 123456.'}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Button type="submit">{editingUser ? 'Salvar' : 'Criar Usuário'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
