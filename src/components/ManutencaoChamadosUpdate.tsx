import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useManutencaoExport } from '@/hooks/useManutencaoExport';
import { Plus, Calendar, Wrench, Shield, AlertTriangle, Search, Clock, CheckCircle, PlayCircle, XCircle, CalendarClock, Download, FileText, FileSpreadsheet, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  praca?: string | null;
}

interface HistoricoItem {
  data: string;
  acao: string;
  usuario: string;
}

interface Chamado {
  id: string;
  customer_id: string | null;
  contrato: string;
  razao_social: string;
  tipo: 'PREVENTIVO' | 'ELETIVO' | 'CORRETIVO';
  status: 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'REAGENDADO';
  descricao: string | null;
  equipamentos: string | null;
  tecnico_responsavel: string | null;
  data_agendada: string;
  data_previsao_conclusao: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  observacoes_conclusao: string | null;
  historico: HistoricoItem[] | null;
  created_by_name: string | null;
  created_at: string;
  praca: string | null;
  laudo_texto: string | null;
  tecnico_executor: string | null;
  cliente_acompanhante: string | null;
  is_auditoria: boolean | null;
}

const TIPO_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PREVENTIVO: { label: 'Preventivo', icon: <Shield className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  ELETIVO: { label: 'Eletivo', icon: <Calendar className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  CORRETIVO: { label: 'Corretivo', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  AGENDADO: { label: 'Agendado', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  EM_ANDAMENTO: { label: 'Em Andamento', icon: <PlayCircle className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  CONCLUIDO: { label: 'Concluído', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  CANCELADO: { label: 'Cancelado', icon: <XCircle className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  REAGENDADO: { label: 'Reagendado', icon: <CalendarClock className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
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

interface ManutencaoChamadosUpdateProps {
  customers: Customer[];
}

export function ManutencaoChamadosUpdate({ customers }: ManutencaoChamadosUpdateProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { exportChamadosXLSX, exportChamadosPDF } = useManutencaoExport();

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChamado, setEditingChamado] = useState<Chamado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPraca, setFilterPraca] = useState<string>('all');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  const [chamadoForm, setChamadoForm] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    tipo: '' as Chamado['tipo'] | '',
    descricao: '',
    tecnico_responsavel: '',
    data_agendada: '',
    data_previsao_conclusao: '',
    praca: '',
  });

  const [editForm, setEditForm] = useState({
    laudo_texto: '',
    tecnico_executor: '',
    cliente_acompanhante: '',
    observacoes_conclusao: '',
  });

  useEffect(() => {
    fetchChamados();
  }, []);

  const fetchChamados = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencao_chamados')
        .select('*')
        .order('data_agendada', { ascending: true });

      if (error) throw error;

      const mappedData: Chamado[] = (data || []).map((item) => ({
        ...item,
        historico: Array.isArray(item.historico) ? (item.historico as unknown as HistoricoItem[]) : [],
      }));
      setChamados(mappedData);
    } catch (error) {
      console.error('Error fetching chamados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setChamadoForm(prev => ({
        ...prev,
        customer_id: customerId,
        contrato: customer.contrato,
        razao_social: customer.razao_social,
        praca: customer.praca || prev.praca,
      }));
    }
  };

  const handleChamadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chamadoForm.tipo || !chamadoForm.data_agendada) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('manutencao_chamados')
        .insert({
          customer_id: chamadoForm.customer_id || null,
          contrato: chamadoForm.contrato,
          razao_social: chamadoForm.razao_social,
          tipo: chamadoForm.tipo,
          descricao: chamadoForm.descricao || null,
          tecnico_responsavel: chamadoForm.tecnico_responsavel || null,
          data_agendada: chamadoForm.data_agendada,
          data_previsao_conclusao: chamadoForm.data_previsao_conclusao || null,
          praca: chamadoForm.praca || null,
          historico: JSON.parse(JSON.stringify([{ data: new Date().toISOString(), acao: 'Chamado criado', usuario: user?.nome || 'Sistema' }])),
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Chamado registrado com sucesso' });
      setDialogOpen(false);
      setChamadoForm({
        customer_id: '',
        contrato: '',
        razao_social: '',
        tipo: '',
        descricao: '',
        tecnico_responsavel: '',
        data_agendada: '',
        data_previsao_conclusao: '',
        praca: '',
      });
      fetchChamados();
    } catch (error) {
      console.error('Error creating chamado:', error);
      toast({ title: 'Erro', description: 'Erro ao registrar chamado', variant: 'destructive' });
    }
  };

  const handleOpenEdit = (chamado: Chamado) => {
    setEditingChamado(chamado);
    setEditForm({
      laudo_texto: chamado.laudo_texto || '',
      tecnico_executor: chamado.tecnico_executor || '',
      cliente_acompanhante: chamado.cliente_acompanhante || '',
      observacoes_conclusao: chamado.observacoes_conclusao || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingChamado) return;

    try {
      const newHistorico = JSON.parse(JSON.stringify([...(editingChamado.historico || []), {
        data: new Date().toISOString(),
        acao: 'Laudo e informações atualizados',
        usuario: user?.nome || 'Sistema',
      }]));

      const { error } = await supabase
        .from('manutencao_chamados')
        .update({
          laudo_texto: editForm.laudo_texto || null,
          tecnico_executor: editForm.tecnico_executor || null,
          cliente_acompanhante: editForm.cliente_acompanhante || null,
          observacoes_conclusao: editForm.observacoes_conclusao || null,
          historico: newHistorico,
        })
        .eq('id', editingChamado.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Chamado atualizado com sucesso' });
      setEditDialogOpen(false);
      setEditingChamado(null);
      fetchChamados();
    } catch (error) {
      console.error('Error updating chamado:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar chamado', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const chamado = chamados.find(c => c.id === id);
      if (!chamado) return;

      const updateData: Record<string, unknown> = { status: newStatus };
      const newHistorico = JSON.parse(JSON.stringify([...(chamado.historico || []), {
        data: new Date().toISOString(),
        acao: `Status alterado para ${STATUS_LABELS[newStatus]?.label || newStatus}`,
        usuario: user?.nome || 'Sistema',
      }]));
      updateData.historico = newHistorico;

      if (newStatus === 'EM_ANDAMENTO' && !chamado.data_inicio) {
        updateData.data_inicio = new Date().toISOString();
      }
      if (newStatus === 'CONCLUIDO') {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('manutencao_chamados')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso' });
      fetchChamados();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const canManage = ['admin', 'supervisor_operacoes', 'implantacao'].includes(user?.role || '');

  // Metrics for preventivos
  const preventivosChamados = chamados.filter(c => c.tipo === 'PREVENTIVO');
  const preventivosAgendados = preventivosChamados.filter(c => c.status === 'AGENDADO').length;
  const preventivosEmAndamento = preventivosChamados.filter(c => c.status === 'EM_ANDAMENTO').length;
  const preventivosConcluidos = preventivosChamados.filter(c => c.status === 'CONCLUIDO').length;

  // Filter chamados
  const filteredChamados = chamados.filter(c => {
    const matchesSearch =
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tecnico_responsavel && c.tecnico_responsavel.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTipo = filterTipo === 'all' || c.tipo === filterTipo;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesPraca = filterPraca === 'all' || c.praca === filterPraca;

    let matchesData = true;
    if (filterDataInicio) {
      matchesData = matchesData && c.data_agendada >= filterDataInicio;
    }
    if (filterDataFim) {
      matchesData = matchesData && c.data_agendada <= filterDataFim;
    }

    return matchesSearch && matchesTipo && matchesStatus && matchesPraca && matchesData;
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Cards for Preventivos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Preventivos Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{preventivosChamados.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{preventivosAgendados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-blue-500" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{preventivosEmAndamento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{preventivosConcluidos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Chamados de Manutenção
          </h2>
          <p className="text-sm text-muted-foreground">
            Controle de manutenções preventivas, eletivas e corretivas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChamadosPDF(filteredChamados, 'Chamados_Manutencao')}>
                <FileText className="h-4 w-4 mr-2" />
                Todos Chamados (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChamadosXLSX(filteredChamados, 'Chamados_Manutencao')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Todos Chamados (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChamadosPDF(preventivosChamados, 'Chamados_Preventivos')}>
                <FileText className="h-4 w-4 mr-2" />
                Preventivos (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Chamado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registrar Novo Chamado</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleChamadoSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select onValueChange={handleCustomerSelect} value={chamadoForm.customer_id}>
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
                      <Label>Contrato *</Label>
                      <Input
                        value={chamadoForm.contrato}
                        onChange={(e) => setChamadoForm(prev => ({ ...prev, contrato: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Razão Social *</Label>
                      <Input
                        value={chamadoForm.razao_social}
                        onChange={(e) => setChamadoForm(prev => ({ ...prev, razao_social: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={chamadoForm.tipo}
                        onValueChange={(value) => setChamadoForm(prev => ({ ...prev, tipo: value as Chamado['tipo'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                          <SelectItem value="ELETIVO">Eletivo</SelectItem>
                          <SelectItem value="CORRETIVO">Corretivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Praça</Label>
                      <Select
                        value={chamadoForm.praca}
                        onValueChange={(value) => setChamadoForm(prev => ({ ...prev, praca: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a praça" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRACAS.map((praca) => (
                            <SelectItem key={praca} value={praca}>{praca}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Agendada *</Label>
                      <Input
                        type="date"
                        value={chamadoForm.data_agendada}
                        onChange={(e) => setChamadoForm(prev => ({ ...prev, data_agendada: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de Conclusão</Label>
                      <Input
                        type="date"
                        value={chamadoForm.data_previsao_conclusao}
                        onChange={(e) => setChamadoForm(prev => ({ ...prev, data_previsao_conclusao: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Técnico Responsável</Label>
                    <Input
                      value={chamadoForm.tecnico_responsavel}
                      onChange={(e) => setChamadoForm(prev => ({ ...prev, tecnico_responsavel: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={chamadoForm.descricao}
                      onChange={(e) => setChamadoForm(prev => ({ ...prev, descricao: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Registrar Chamado</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, contrato ou técnico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPraca} onValueChange={setFilterPraca}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Praça" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas praças</SelectItem>
                {PRACAS.map((praca) => (
                  <SelectItem key={praca} value={praca}>{praca}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                <SelectItem value="ELETIVO">Eletivo</SelectItem>
                <SelectItem value="CORRETIVO">Corretivo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
                placeholder="De"
                className="w-[140px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                placeholder="Até"
                className="w-[140px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chamados Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chamados ({filteredChamados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredChamados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum chamado encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Praça</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Agendada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Técnico</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((chamado) => (
                  <TableRow key={chamado.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{chamado.razao_social}</span>
                        <div className="text-xs text-muted-foreground">{chamado.contrato}</div>
                      </div>
                    </TableCell>
                    <TableCell>{chamado.praca || '-'}</TableCell>
                    <TableCell>
                      <Badge className={TIPO_LABELS[chamado.tipo]?.color}>
                        {TIPO_LABELS[chamado.tipo]?.icon}
                        <span className="ml-1">{TIPO_LABELS[chamado.tipo]?.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(chamado.data_agendada), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={chamado.status}
                        onValueChange={(value) => handleStatusChange(chamado.id, value)}
                        disabled={!canManage}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <Badge className={STATUS_LABELS[chamado.status]?.color}>
                            {STATUS_LABELS[chamado.status]?.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{chamado.tecnico_responsavel || chamado.tecnico_executor || '-'}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(chamado)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Laudo (Texto)</Label>
              <Textarea
                value={editForm.laudo_texto}
                onChange={(e) => setEditForm(prev => ({ ...prev, laudo_texto: e.target.value }))}
                placeholder="Descreva o laudo da visita..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Técnico Executor</Label>
                <Input
                  value={editForm.tecnico_executor}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tecnico_executor: e.target.value }))}
                  placeholder="Nome do técnico"
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente Acompanhante</Label>
                <Input
                  value={editForm.cliente_acompanhante}
                  onChange={(e) => setEditForm(prev => ({ ...prev, cliente_acompanhante: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações de Conclusão</Label>
              <Textarea
                value={editForm.observacoes_conclusao}
                onChange={(e) => setEditForm(prev => ({ ...prev, observacoes_conclusao: e.target.value }))}
                placeholder="Observações gerais..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
