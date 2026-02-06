import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Search, Bell, Edit, Trash2, MapPin, User, AlertTriangle } from 'lucide-react';
import { format, differenceInHours, parseISO, addMonths, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  praca?: string | null;
}

interface Supervisor {
  id: string;
  nome: string;
  filial?: string | null;
  filiais?: string[] | null;
}

interface AgendaPreventiva {
  id: string;
  customer_id: string;
  contrato: string;
  razao_social: string;
  frequencia: string;
  proxima_execucao: string;
  ultima_execucao: string | null;
  ativo: boolean;
  praca: string | null;
  supervisor_responsavel_id: string | null;
  supervisor_responsavel_nome: string | null;
  tecnico_responsavel: string | null;
  created_at: string;
  notificacao_enviada: boolean | null;
}

const PRACAS = [
  'São Paulo-SP',
  'Rio de Janeiro-RJ',
  'Belo Horizonte-MG',
  'Vitória-ES',
];

const FREQUENCIAS = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'QUADRIMESTRAL', label: 'Quadrimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
];

export default function ManutencaoPreventivas() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [agendas, setAgendas] = useState<AgendaPreventiva[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaPreventiva | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPraca, setFilterPraca] = useState<string>('all');
  const [filterSupervisor, setFilterSupervisor] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    frequencia: 'MENSAL',
    proxima_execucao: '',
    praca: '',
    supervisor_responsavel_id: '',
    tecnico_responsavel: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch agendas
      const { data: agendasData, error: agendasError } = await supabase
        .from('manutencao_agendas_preventivas')
        .select('*')
        .order('proxima_execucao', { ascending: true });

      if (agendasError) throw agendasError;
      setAgendas(agendasData || []);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, praca')
        .order('razao_social');

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch supervisors (users with supervisor_operacoes role)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor_operacoes');

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome, filial, filiais')
          .in('id', userIds);

        setSupervisors(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
        praca: customer.praca || '',
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

  const calculateNextExecution = (frequencia: string, baseDate: Date): Date => {
    switch (frequencia) {
      case 'SEMANAL': return addWeeks(baseDate, 1);
      case 'QUINZENAL': return addWeeks(baseDate, 2);
      case 'MENSAL': return addMonths(baseDate, 1);
      case 'BIMESTRAL': return addMonths(baseDate, 2);
      case 'TRIMESTRAL': return addMonths(baseDate, 3);
      case 'SEMESTRAL': return addMonths(baseDate, 6);
      case 'ANUAL': return addMonths(baseDate, 12);
      default: return addMonths(baseDate, 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const supervisor = supervisors.find(s => s.id === formData.supervisor_responsavel_id);

    try {
      if (editingAgenda) {
        // Update existing
        const { error } = await supabase
          .from('manutencao_agendas_preventivas')
          .update({
            contrato: formData.contrato,
            razao_social: formData.razao_social,
            frequencia: formData.frequencia as "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "QUADRIMESTRAL" | "SEMESTRAL" | "ANUAL",
            proxima_execucao: formData.proxima_execucao,
            praca: formData.praca || null,
            supervisor_responsavel_id: formData.supervisor_responsavel_id || null,
            supervisor_responsavel_nome: supervisor?.nome || null,
            tecnico_responsavel: formData.tecnico_responsavel || null,
            notificacao_enviada: false,
          })
          .eq('id', editingAgenda.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Agenda atualizada com sucesso',
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('manutencao_agendas_preventivas')
          .insert({
            customer_id: formData.customer_id,
            contrato: formData.contrato,
            razao_social: formData.razao_social,
            descricao: 'Manutenção Preventiva',
            frequencia: formData.frequencia as "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "QUADRIMESTRAL" | "SEMESTRAL" | "ANUAL",
            proxima_execucao: formData.proxima_execucao,
            praca: formData.praca || null,
            supervisor_responsavel_id: formData.supervisor_responsavel_id || null,
            supervisor_responsavel_nome: supervisor?.nome || null,
            tecnico_responsavel: formData.tecnico_responsavel || null,
            created_by: user?.id,
            created_by_name: user?.nome,
          });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Agenda criada com sucesso',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving agenda:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar agenda',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (agenda: AgendaPreventiva) => {
    setEditingAgenda(agenda);
    setFormData({
      customer_id: agenda.customer_id,
      contrato: agenda.contrato,
      razao_social: agenda.razao_social,
      frequencia: agenda.frequencia,
      proxima_execucao: agenda.proxima_execucao,
      praca: agenda.praca || '',
      supervisor_responsavel_id: agenda.supervisor_responsavel_id || '',
      tecnico_responsavel: agenda.tecnico_responsavel || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('manutencao_agendas_preventivas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Agenda excluída com sucesso',
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting agenda:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir agenda',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingAgenda(null);
    setFormData({
      customer_id: '',
      contrato: '',
      razao_social: '',
      frequencia: 'MENSAL',
      proxima_execucao: '',
      praca: '',
      supervisor_responsavel_id: '',
      tecnico_responsavel: '',
    });
  };

  // Filter agendas
  const filteredAgendas = agendas.filter(agenda => {
    const matchesSearch = 
      agenda.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agenda.contrato.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPraca = filterPraca === 'all' || agenda.praca === filterPraca;
    const matchesSupervisor = filterSupervisor === 'all' || agenda.supervisor_responsavel_id === filterSupervisor;

    return matchesSearch && matchesPraca && matchesSupervisor;
  });

  // Check for notifications (48h before)
  const agendasProximas = agendas.filter(agenda => {
    if (!agenda.ativo) return false;
    const hoursUntil = differenceInHours(parseISO(agenda.proxima_execucao), new Date());
    return hoursUntil > 0 && hoursUntil <= 48;
  });

  const getFrequenciaLabel = (freq: string) => {
    return FREQUENCIAS.find(f => f.value === freq)?.label || freq;
  };

  const isProximaExecucaoClose = (data: string) => {
    const hoursUntil = differenceInHours(parseISO(data), new Date());
    return hoursUntil > 0 && hoursUntil <= 48;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Agendas de Manutenção Preventiva
            </h1>
            <p className="text-muted-foreground">
              Gerencie as agendas de manutenção preventiva dos clientes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Agenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAgenda ? 'Editar Agenda' : 'Nova Agenda de Manutenção Preventiva'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select 
                    onValueChange={handleCustomerSelect} 
                    value={formData.customer_id}
                    disabled={!!editingAgenda}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.razao_social} - {customer.contrato}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Praça (Regional) *</Label>
                    <Select 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, praca: value }))} 
                      value={formData.praca}
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
                      onValueChange={handleSupervisorSelect} 
                      value={formData.supervisor_responsavel_id}
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
                      onValueChange={(value) => setFormData(prev => ({ ...prev, frequencia: value }))} 
                      value={formData.frequencia}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIAS.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxima_execucao">Próxima Execução *</Label>
                    <Input
                      id="proxima_execucao"
                      type="date"
                      value={formData.proxima_execucao}
                      onChange={(e) => setFormData(prev => ({ ...prev, proxima_execucao: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tecnico">Técnico Responsável</Label>
                  <Input
                    id="tecnico"
                    value={formData.tecnico_responsavel}
                    onChange={(e) => setFormData(prev => ({ ...prev, tecnico_responsavel: e.target.value }))}
                    placeholder="Nome do técnico responsável"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingAgenda ? 'Salvar' : 'Criar Agenda'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Notifications Alert */}
        {agendasProximas.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                    {agendasProximas.length} agenda(s) com execução nas próximas 48 horas
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {agendasProximas.slice(0, 3).map(agenda => (
                      <li key={agenda.id} className="text-sm text-amber-700 dark:text-amber-300">
                        • {agenda.razao_social} - {format(parseISO(agenda.proxima_execucao), "dd/MM/yyyy", { locale: ptBR })}
                      </li>
                    ))}
                    {agendasProximas.length > 3 && (
                      <li className="text-sm text-amber-600">+ {agendasProximas.length - 3} mais...</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por praça" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as praças</SelectItem>
                  {PRACAS.map((praca) => (
                    <SelectItem key={praca} value={praca}>{praca}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
                <SelectTrigger className="w-[200px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os supervisores</SelectItem>
                  {supervisors.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agendas ({filteredAgendas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAgendas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma agenda encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Praça</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Próxima Execução</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgendas.map((agenda) => (
                      <TableRow key={agenda.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {agenda.razao_social}
                        </TableCell>
                        <TableCell>{agenda.contrato}</TableCell>
                        <TableCell>
                          {agenda.praca ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <MapPin className="h-3 w-3" />
                              {agenda.praca}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{agenda.supervisor_responsavel_nome || '-'}</TableCell>
                        <TableCell>{getFrequenciaLabel(agenda.frequencia)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{format(parseISO(agenda.proxima_execucao), "dd/MM/yyyy", { locale: ptBR })}</span>
                            {isProximaExecucaoClose(agenda.proxima_execucao) && (
                              <Badge className="bg-amber-500 text-white flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                48h
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{agenda.tecnico_responsavel || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(agenda)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a agenda de manutenção preventiva de {agenda.razao_social}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(agenda.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
