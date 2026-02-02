import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Wrench, Search, MapPin, Calendar, CheckCircle, Clock, Edit, Download, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  praca?: string | null;
}

interface Chamado {
  id: string;
  customer_id: string | null;
  contrato: string;
  razao_social: string;
  tipo: string;
  status: string;
  descricao: string | null;
  data_agendada: string;
  data_conclusao: string | null;
  tecnico_responsavel: string | null;
  tecnico_executor: string | null;
  cliente_acompanhante: string | null;
  laudo_texto: string | null;
  praca: string | null;
  is_auditoria: boolean | null;
  created_at: string;
}

const PRACAS = [
  'São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'Sorocaba',
  'São José dos Campos', 'Bauru', 'Curitiba', 'Belo Horizonte', 'Rio de Janeiro',
];

const TIPOS_CHAMADO = [
  { value: 'PREVENTIVO', label: 'Preventivo', color: 'bg-blue-500' },
  { value: 'ELETIVO', label: 'Eletivo', color: 'bg-purple-500' },
  { value: 'CORRETIVO', label: 'Corretivo', color: 'bg-red-500' },
];

const STATUS_CHAMADO = [
  { value: 'AGENDADO', label: 'Agendado', color: 'bg-yellow-500' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-blue-500' },
  { value: 'CONCLUIDO', label: 'Concluído', color: 'bg-green-500' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-gray-500' },
];

export default function ManutencaoChamados() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPraca, setFilterPraca] = useState<string>('all');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');

  // Form state for new chamado
  const [formData, setFormData] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    tipo: 'PREVENTIVO',
    descricao: '',
    data_agendada: '',
    praca: '',
    tecnico_responsavel: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    laudo_texto: '',
    tecnico_executor: '',
    cliente_acompanhante: '',
    status: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: chamadosData, error: chamadosError } = await supabase
        .from('manutencao_chamados')
        .select('*')
        .order('data_agendada', { ascending: false });

      if (chamadosError) throw chamadosError;
      setChamados(chamadosData || []);

      const { data: customersData, error: customersError } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, praca')
        .order('razao_social');

      if (customersError) throw customersError;
      setCustomers(customersData || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('manutencao_chamados')
        .insert({
          customer_id: formData.customer_id || null,
          contrato: formData.contrato,
          razao_social: formData.razao_social,
          tipo: formData.tipo as "PREVENTIVO" | "ELETIVO" | "CORRETIVO",
          descricao: formData.descricao || null,
          data_agendada: formData.data_agendada,
          praca: formData.praca || null,
          tecnico_responsavel: formData.tecnico_responsavel || null,
          created_by: user?.id,
          created_by_name: user?.nome,
          historico: [{
            data: new Date().toISOString(),
            acao: 'Chamado criado',
            usuario: user?.nome || 'Sistema',
          }],
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chamado criado com sucesso',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating chamado:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar chamado',
        variant: 'destructive',
      });
    }
  };

  const handleEditChamado = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setEditFormData({
      laudo_texto: chamado.laudo_texto || '',
      tecnico_executor: chamado.tecnico_executor || '',
      cliente_acompanhante: chamado.cliente_acompanhante || '',
      status: chamado.status,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateChamado = async () => {
    if (!selectedChamado) return;

    try {
      const updateData: Record<string, unknown> = {
        laudo_texto: editFormData.laudo_texto || null,
        tecnico_executor: editFormData.tecnico_executor || null,
        cliente_acompanhante: editFormData.cliente_acompanhante || null,
        status: editFormData.status,
      };

      if (editFormData.status === 'CONCLUIDO') {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('manutencao_chamados')
        .update(updateData)
        .eq('id', selectedChamado.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chamado atualizado com sucesso',
      });

      setEditDialogOpen(false);
      setSelectedChamado(null);
      fetchData();
    } catch (error) {
      console.error('Error updating chamado:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar chamado',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      contrato: '',
      razao_social: '',
      tipo: 'PREVENTIVO',
      descricao: '',
      data_agendada: '',
      praca: '',
      tecnico_responsavel: '',
    });
  };

  // Filter chamados
  const filteredChamados = chamados.filter(chamado => {
    const matchesSearch = 
      chamado.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.contrato.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = filterTipo === 'all' || chamado.tipo === filterTipo;
    const matchesStatus = filterStatus === 'all' || chamado.status === filterStatus;
    const matchesPraca = filterPraca === 'all' || chamado.praca === filterPraca;
    
    let matchesData = true;
    if (filterDataInicio) {
      matchesData = matchesData && chamado.data_agendada >= filterDataInicio;
    }
    if (filterDataFim) {
      matchesData = matchesData && chamado.data_agendada <= filterDataFim;
    }

    return matchesSearch && matchesTipo && matchesStatus && matchesPraca && matchesData;
  });

  // Dashboard metrics for preventive
  const chamadosPreventivos = chamados.filter(c => c.tipo === 'PREVENTIVO');
  const preventivosConcluidos = chamadosPreventivos.filter(c => c.status === 'CONCLUIDO').length;
  const preventivosAgendados = chamadosPreventivos.filter(c => c.status === 'AGENDADO').length;
  const preventivosEmAndamento = chamadosPreventivos.filter(c => c.status === 'EM_ANDAMENTO').length;

  const getTipoBadge = (tipo: string) => {
    const tipoInfo = TIPOS_CHAMADO.find(t => t.value === tipo);
    return (
      <Badge className={`${tipoInfo?.color} text-white`}>
        {tipoInfo?.label || tipo}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_CHAMADO.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color} text-white`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const exportRelatorioPDF = (clienteId?: string, dataInicio?: string, dataFim?: string) => {
    let chamadosExport = filteredChamados;
    
    if (clienteId) {
      chamadosExport = chamadosExport.filter(c => c.customer_id === clienteId);
    }
    
    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.text('Relatório de Chamados de Manutenção', 105, yPos, { align: 'center' });
    yPos += 15;
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, yPos);
    yPos += 10;
    
    if (dataInicio || dataFim) {
      doc.text(`Período: ${dataInicio || 'Início'} a ${dataFim || 'Hoje'}`, 20, yPos);
      yPos += 10;
    }
    
    doc.text(`Total de chamados: ${chamadosExport.length}`, 20, yPos);
    yPos += 15;

    // Headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, yPos);
    doc.text('Tipo', 80, yPos);
    doc.text('Status', 110, yPos);
    doc.text('Data', 140, yPos);
    doc.text('Técnico', 170, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    chamadosExport.forEach(chamado => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(chamado.razao_social.substring(0, 25), 20, yPos);
      doc.text(TIPOS_CHAMADO.find(t => t.value === chamado.tipo)?.label || chamado.tipo, 80, yPos);
      doc.text(STATUS_CHAMADO.find(s => s.value === chamado.status)?.label || chamado.status, 110, yPos);
      doc.text(format(parseISO(chamado.data_agendada), 'dd/MM/yyyy', { locale: ptBR }), 140, yPos);
      doc.text((chamado.tecnico_executor || chamado.tecnico_responsavel || '-').substring(0, 15), 170, yPos);
      yPos += 6;
    });

    doc.save(`relatorio_chamados_${format(new Date(), 'yyyyMMdd')}.pdf`);
    
    toast({
      title: 'Relatório gerado',
      description: 'O PDF foi baixado com sucesso.',
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              Chamados de Manutenção
            </h1>
            <p className="text-muted-foreground">
              Gerencie os chamados de manutenção preventiva, eletiva e corretiva
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportRelatorioPDF()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Relatório Geral (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportRelatorioPDF(undefined, filterDataInicio, filterDataFim)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Relatório do Período (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Chamado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Chamado de Manutenção</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select onValueChange={handleCustomerSelect} value={formData.customer_id}>
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
                      <Label htmlFor="contrato">Contrato *</Label>
                      <Input
                        id="contrato"
                        value={formData.contrato}
                        onChange={(e) => setFormData(prev => ({ ...prev, contrato: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razao_social">Razão Social *</Label>
                      <Input
                        id="razao_social"
                        value={formData.razao_social}
                        onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))} value={formData.tipo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CHAMADO.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Praça</Label>
                      <Select onValueChange={(value) => setFormData(prev => ({ ...prev, praca: value }))} value={formData.praca}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRACAS.map((praca) => (
                            <SelectItem key={praca} value={praca}>{praca}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_agendada">Data Agendada *</Label>
                      <Input
                        id="data_agendada"
                        type="date"
                        value={formData.data_agendada}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_agendada: e.target.value }))}
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Chamado</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard Cards - Preventivos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Preventivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{chamadosPreventivos.length}</div>
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
                <Wrench className="h-4 w-4 text-blue-500" />
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
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {TIPOS_CHAMADO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {STATUS_CHAMADO.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPraca} onValueChange={setFilterPraca}>
                <SelectTrigger className="w-[150px]">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Praça" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas praças</SelectItem>
                  {PRACAS.map((praca) => (
                    <SelectItem key={praca} value={praca}>{praca}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  className="w-[150px]"
                  placeholder="Data início"
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  className="w-[150px]"
                  placeholder="Data fim"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chamados ({filteredChamados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredChamados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum chamado encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Praça</TableHead>
                      <TableHead>Data Agendada</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChamados.map((chamado) => (
                      <TableRow key={chamado.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {chamado.razao_social}
                          {chamado.is_auditoria && (
                            <Badge variant="outline" className="ml-2 text-xs">Auditoria</Badge>
                          )}
                        </TableCell>
                        <TableCell>{chamado.contrato}</TableCell>
                        <TableCell>{getTipoBadge(chamado.tipo)}</TableCell>
                        <TableCell>{getStatusBadge(chamado.status)}</TableCell>
                        <TableCell>
                          {chamado.praca ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <MapPin className="h-3 w-3" />
                              {chamado.praca}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(chamado.data_agendada), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{chamado.tecnico_executor || chamado.tecnico_responsavel || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditChamado(chamado)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Chamado - {selectedChamado?.razao_social}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tecnico">Técnico Executor</Label>
                  <Input
                    id="edit-tecnico"
                    value={editFormData.tecnico_executor}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tecnico_executor: e.target.value }))}
                    placeholder="Nome do técnico que executou"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cliente">Cliente que Acompanhou</Label>
                  <Input
                    id="edit-cliente"
                    value={editFormData.cliente_acompanhante}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, cliente_acompanhante: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CHAMADO.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-laudo">Laudo da Visita</Label>
                <Textarea
                  id="edit-laudo"
                  value={editFormData.laudo_texto}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, laudo_texto: e.target.value }))}
                  placeholder="Descreva o que foi realizado na visita..."
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateChamado}>Salvar Alterações</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
