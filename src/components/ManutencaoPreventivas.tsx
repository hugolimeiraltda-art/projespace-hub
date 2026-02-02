import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Search, Edit, Trash2, Shield, Bell } from 'lucide-react';
import { format, addWeeks, addMonths, differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  praca?: string | null;
}

interface Supervisor {
  id: string;
  nome: string;
}

interface AgendaPreventiva {
  id: string;
  customer_id: string;
  contrato: string;
  razao_social: string;
  frequencia: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  tecnico_responsavel: string | null;
  proxima_execucao: string;
  ultima_execucao: string | null;
  ativo: boolean;
  praca: string | null;
  supervisor_responsavel_id: string | null;
  supervisor_responsavel_nome: string | null;
  notificacao_enviada: boolean;
  created_at: string;
}

const FREQUENCIA_LABELS: Record<string, string> = {
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

const PRACAS = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Brasília',
  'Recife',
  'Fortaleza',
  'Goiânia',
];

interface ManutencaoPreventivasProps {
  customers: Customer[];
}

export function ManutencaoPreventivas({ customers }: ManutencaoPreventivasProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [agendas, setAgendas] = useState<AgendaPreventiva[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaPreventiva | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendaToDelete, setAgendaToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPraca, setFilterPraca] = useState<string>('all');

  const [formData, setFormData] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    frequencia: '' as AgendaPreventiva['frequencia'] | '',
    tecnico_responsavel: '',
    proxima_execucao: '',
    praca: '',
    supervisor_responsavel_id: '',
  });

  useEffect(() => {
    fetchAgendas();
    fetchSupervisors();
  }, []);

  const fetchAgendas = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencao_agendas_preventivas')
        .select('*')
        .order('proxima_execucao', { ascending: true });

      if (error) throw error;
      setAgendas((data as AgendaPreventiva[]) || []);
    } catch (error) {
      console.error('Error fetching agendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      // Get users with supervisor_operacoes role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor_operacoes');

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);

        setSupervisors(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        contrato: customer.contrato,
        razao_social: customer.razao_social,
        praca: customer.praca || prev.praca,
      }));
    }
  };

  const handleSupervisorSelect = (supervisorId: string) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    setFormData(prev => ({
      ...prev,
      supervisor_responsavel_id: supervisorId,
    }));
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      contrato: '',
      razao_social: '',
      frequencia: '',
      tecnico_responsavel: '',
      proxima_execucao: '',
      praca: '',
      supervisor_responsavel_id: '',
    });
    setEditingAgenda(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.frequencia || !formData.proxima_execucao) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const supervisor = supervisors.find(s => s.id === formData.supervisor_responsavel_id);

      const agendaData = {
        customer_id: formData.customer_id,
        contrato: formData.contrato,
        razao_social: formData.razao_social,
        descricao: 'Manutenção Preventiva', // Fixed description
        frequencia: formData.frequencia,
        tecnico_responsavel: formData.tecnico_responsavel || null,
        proxima_execucao: formData.proxima_execucao,
        praca: formData.praca || null,
        supervisor_responsavel_id: formData.supervisor_responsavel_id || null,
        supervisor_responsavel_nome: supervisor?.nome || null,
      };

      if (editingAgenda) {
        const { error } = await supabase
          .from('manutencao_agendas_preventivas')
          .update(agendaData)
          .eq('id', editingAgenda.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Agenda atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('manutencao_agendas_preventivas')
          .insert({
            ...agendaData,
            created_by: user?.id,
            created_by_name: user?.nome,
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Agenda criada com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      fetchAgendas();
    } catch (error) {
      console.error('Error saving agenda:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar agenda', variant: 'destructive' });
    }
  };

  const handleEdit = (agenda: AgendaPreventiva) => {
    setEditingAgenda(agenda);
    setFormData({
      customer_id: agenda.customer_id,
      contrato: agenda.contrato,
      razao_social: agenda.razao_social,
      frequencia: agenda.frequencia,
      tecnico_responsavel: agenda.tecnico_responsavel || '',
      proxima_execucao: agenda.proxima_execucao,
      praca: agenda.praca || '',
      supervisor_responsavel_id: agenda.supervisor_responsavel_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!agendaToDelete) return;

    try {
      const { error } = await supabase
        .from('manutencao_agendas_preventivas')
        .delete()
        .eq('id', agendaToDelete);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Agenda excluída com sucesso' });
      fetchAgendas();
    } catch (error) {
      console.error('Error deleting agenda:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir agenda', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setAgendaToDelete(null);
    }
  };

  const toggleAgendaAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('manutencao_agendas_preventivas')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
      fetchAgendas();
    } catch (error) {
      console.error('Error toggling agenda:', error);
    }
  };

  // Check if notification should be shown (48h before)
  const shouldShowNotification = (proximaExecucao: string): boolean => {
    const hoursUntil = differenceInHours(parseISO(proximaExecucao), new Date());
    return hoursUntil <= 48 && hoursUntil > 0;
  };

  const canManage = ['admin', 'supervisor_operacoes', 'implantacao'].includes(user?.role || '');

  // Filter agendas
  const filteredAgendas = agendas.filter(a => {
    const matchesSearch =
      a.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contrato.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPraca = filterPraca === 'all' || a.praca === filterPraca;

    return matchesSearch && matchesPraca;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Agendas de Manutenção Preventiva
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as agendas de manutenção preventiva dos clientes
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Agenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAgenda ? 'Editar Agenda' : 'Nova Agenda Preventiva'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select onValueChange={handleCustomerSelect} value={formData.customer_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.razao_social} - {customer.contrato}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Praça *</Label>
                    <Select
                      value={formData.praca}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, praca: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a praça" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRACAS.map((praca) => (
                          <SelectItem key={praca} value={praca}>
                            {praca}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Supervisor Responsável</Label>
                    <Select
                      value={formData.supervisor_responsavel_id}
                      onValueChange={handleSupervisorSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência *</Label>
                    <Select
                      value={formData.frequencia}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, frequencia: value as AgendaPreventiva['frequencia'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FREQUENCIA_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Próxima Execução *</Label>
                    <Input
                      type="date"
                      value={formData.proxima_execucao}
                      onChange={(e) => setFormData(prev => ({ ...prev, proxima_execucao: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Técnico Responsável</Label>
                  <Input
                    value={formData.tecnico_responsavel}
                    onChange={(e) => setFormData(prev => ({ ...prev, tecnico_responsavel: e.target.value }))}
                    placeholder="Nome do técnico"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingAgenda ? 'Salvar' : 'Criar Agenda'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou contrato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPraca} onValueChange={setFilterPraca}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por praça" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as praças</SelectItem>
                {PRACAS.map((praca) => (
                  <SelectItem key={praca} value={praca}>
                    {praca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agendas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agendas Ativas ({filteredAgendas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredAgendas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma agenda encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Praça</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Próxima Execução</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Ativo</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgendas.map((agenda) => (
                  <TableRow key={agenda.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{agenda.razao_social}</span>
                        <div className="text-xs text-muted-foreground">{agenda.contrato}</div>
                      </div>
                    </TableCell>
                    <TableCell>{agenda.praca || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FREQUENCIA_LABELS[agenda.frequencia]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(parseISO(agenda.proxima_execucao), 'dd/MM/yyyy', { locale: ptBR })}
                        {shouldShowNotification(agenda.proxima_execucao) && (
                          <Bell className="h-4 w-4 text-amber-500 animate-pulse" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{agenda.supervisor_responsavel_nome || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={agenda.ativo}
                        onCheckedChange={(checked) => toggleAgendaAtivo(agenda.id, checked)}
                        disabled={!canManage}
                      />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(agenda)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAgendaToDelete(agenda.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta agenda preventiva? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
