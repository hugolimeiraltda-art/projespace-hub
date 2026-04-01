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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useManutencaoExport } from '@/hooks/useManutencaoExport';
import { Plus, Calendar, Wrench, Shield, AlertTriangle, Search, Clock, CheckCircle, PlayCircle, XCircle, CalendarClock, History, Download, FileText, FileSpreadsheet, Upload, Image } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
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
  tecnico_executor: string | null;
  cliente_acompanhante: string | null;
  laudo_texto: string | null;
  laudo_fotos: string[] | null;
  praca: string | null;
  data_agendada: string;
  data_previsao_conclusao: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  observacoes_conclusao: string | null;
  historico: HistoricoItem[] | null;
  created_by_name: string | null;
  created_at: string;
}

interface AgendaPreventiva {
  id: string;
  customer_id: string;
  contrato: string;
  razao_social: string;
  descricao: string;
  equipamentos: string | null;
  frequencia: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'QUADRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  tecnico_responsavel: string | null;
  proxima_execucao: string;
  ultima_execucao: string | null;
  ativo: boolean;
  praca: string | null;
}

const TIPO_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PREVENTIVO: { label: 'Preventivo', icon: <Shield className="h-4 w-4" />, color: 'bg-status-analysis-bg text-status-analysis' },
  ELETIVO: { label: 'Eletivo', icon: <Calendar className="h-4 w-4" />, color: 'bg-primary/20 text-primary' },
  CORRETIVO: { label: 'Corretivo', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-destructive/20 text-destructive' },
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  AGENDADO: { label: 'Agendado', icon: <Clock className="h-4 w-4" />, color: 'bg-status-sent-bg text-status-sent' },
  EM_ANDAMENTO: { label: 'Em Andamento', icon: <PlayCircle className="h-4 w-4" />, color: 'bg-status-analysis-bg text-status-analysis' },
  CONCLUIDO: { label: 'Concluído', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-status-approved-bg text-status-approved' },
  CANCELADO: { label: 'Cancelado', icon: <XCircle className="h-4 w-4" />, color: 'bg-muted text-muted-foreground' },
  REAGENDADO: { label: 'Reagendado', icon: <CalendarClock className="h-4 w-4" />, color: 'bg-status-pending-bg text-status-pending' },
};

const FREQUENCIA_LABELS: Record<string, string> = {
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  QUADRIMESTRAL: 'Quadrimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

interface ManutencaoChamadosProps {
  customers: Customer[];
}

export function ManutencaoChamados({ customers }: ManutencaoChamadosProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { exportChamadosXLSX, exportChamadosPDF } = useManutencaoExport();
  
  const [activeTab, setActiveTab] = useState('chamados');
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [agendas, setAgendas] = useState<AgendaPreventiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Execution dialog state
  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [execChamado, setExecChamado] = useState<Chamado | null>(null);
  const [execForm, setExecForm] = useState({
    tecnico_executor: '',
    cliente_acompanhante: '',
    laudo_texto: '',
    observacoes_conclusao: '',
  });
  const [execFotos, setExecFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form state for chamado
  const [chamadoForm, setChamadoForm] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    tipo: '' as 'PREVENTIVO' | 'ELETIVO' | 'CORRETIVO' | '',
    descricao: '',
    equipamentos: '',
    tecnico_responsavel: '',
    data_agendada: '',
    data_previsao_conclusao: '',
  });

  // Form state for agenda preventiva
  const [agendaForm, setAgendaForm] = useState({
    customer_id: '',
    contrato: '',
    razao_social: '',
    descricao: '',
    equipamentos: '',
    frequencia: '' as 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'QUADRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | '',
    tecnico_responsavel: '',
    proxima_execucao: '',
  });

  useEffect(() => {
    fetchChamados();
    fetchAgendas();
  }, []);

  const fetchChamados = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencao_chamados')
        .select('*')
        .order('data_agendada', { ascending: false });

      if (error) throw error;
      
      const mappedData: Chamado[] = (data || []).map((item) => ({
        ...item,
        historico: Array.isArray(item.historico) ? (item.historico as unknown as HistoricoItem[]) : [],
        laudo_fotos: Array.isArray(item.laudo_fotos) ? item.laudo_fotos as string[] : [],
      }));
      setChamados(mappedData);
    } catch (error) {
      console.error('Error fetching chamados:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleCustomerSelect = (customerId: string, formType: 'chamado' | 'agenda') => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    if (formType === 'chamado') {
      setChamadoForm(prev => ({
        ...prev,
        customer_id: customerId,
        contrato: customer.contrato,
        razao_social: customer.razao_social,
      }));
    } else {
      setAgendaForm(prev => ({
        ...prev,
        customer_id: customerId,
        contrato: customer.contrato,
        razao_social: customer.razao_social,
      }));
    }
  };

  const handleChamadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('manutencao_chamados')
        .insert({
          customer_id: chamadoForm.customer_id || null,
          contrato: chamadoForm.contrato,
          razao_social: chamadoForm.razao_social,
          tipo: chamadoForm.tipo as 'PREVENTIVO' | 'ELETIVO' | 'CORRETIVO',
          descricao: chamadoForm.descricao || null,
          equipamentos: chamadoForm.equipamentos || null,
          tecnico_responsavel: chamadoForm.tecnico_responsavel || null,
          data_agendada: chamadoForm.data_agendada,
          data_previsao_conclusao: chamadoForm.data_previsao_conclusao || null,
          historico: [{ data: new Date().toISOString(), acao: 'Chamado criado', usuario: user?.nome || 'Sistema' }],
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Chamado registrado com sucesso' });
      setDialogOpen(false);
      setChamadoForm({ customer_id: '', contrato: '', razao_social: '', tipo: '', descricao: '', equipamentos: '', tecnico_responsavel: '', data_agendada: '', data_previsao_conclusao: '' });
      fetchChamados();
    } catch (error) {
      console.error('Error creating chamado:', error);
      toast({ title: 'Erro', description: 'Erro ao criar chamado', variant: 'destructive' });
    }
  };

  const handleAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('manutencao_agendas_preventivas')
        .insert({
          customer_id: agendaForm.customer_id,
          contrato: agendaForm.contrato,
          razao_social: agendaForm.razao_social,
          descricao: agendaForm.descricao,
          equipamentos: agendaForm.equipamentos || null,
          frequencia: agendaForm.frequencia as "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "QUADRIMESTRAL" | "SEMESTRAL" | "ANUAL",
          tecnico_responsavel: agendaForm.tecnico_responsavel || null,
          proxima_execucao: agendaForm.proxima_execucao,
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Agenda preventiva criada com sucesso' });
      setAgendaDialogOpen(false);
      setAgendaForm({ customer_id: '', contrato: '', razao_social: '', descricao: '', equipamentos: '', frequencia: '', tecnico_responsavel: '', proxima_execucao: '' });
      fetchAgendas();
    } catch (error) {
      console.error('Error creating agenda:', error);
      toast({ title: 'Erro', description: 'Erro ao criar agenda preventiva', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const chamado = chamados.find(c => c.id === id);
      if (!chamado) return;

      const updateData: Record<string, unknown> = { status: newStatus };
      const newHistorico = [...(chamado.historico || []), {
        data: new Date().toISOString(),
        acao: `Status alterado para ${STATUS_LABELS[newStatus]?.label || newStatus}`,
        usuario: user?.nome || 'Sistema',
      }];
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

  // Open execution dialog
  const openExecDialog = (chamado: Chamado) => {
    setExecChamado(chamado);
    setExecForm({
      tecnico_executor: chamado.tecnico_executor || chamado.tecnico_responsavel || '',
      cliente_acompanhante: chamado.cliente_acompanhante || '',
      laudo_texto: chamado.laudo_texto || '',
      observacoes_conclusao: chamado.observacoes_conclusao || '',
    });
    setExecFotos(chamado.laudo_fotos || []);
    setExecDialogOpen(true);
  };

  // Upload laudo photo
  const handleUploadLaudoFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !execChamado) return;
    setUploading(true);
    const filePath = `${execChamado.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('manutencao-laudos').upload(filePath, file);
    if (upErr) { toast({ title: 'Erro', description: 'Erro ao enviar imagem', variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('manutencao-laudos').getPublicUrl(filePath);
    setExecFotos(prev => [...prev, urlData.publicUrl]);
    setUploading(false);
    e.target.value = '';
  };

  const removeFoto = (index: number) => {
    setExecFotos(prev => prev.filter((_, i) => i !== index));
  };

  // Submit execution (conclude chamado)
  const handleExecSubmit = async () => {
    if (!execChamado) return;
    if (!execForm.tecnico_executor.trim()) {
      toast({ title: 'Erro', description: 'Informe quem executou o chamado', variant: 'destructive' });
      return;
    }

    try {
      const newHistorico = [...(execChamado.historico || []), {
        data: new Date().toISOString(),
        acao: `Chamado concluído por ${execForm.tecnico_executor}. Acompanhante: ${execForm.cliente_acompanhante || 'N/A'}`,
        usuario: user?.nome || 'Sistema',
      }];

      const { error } = await supabase
        .from('manutencao_chamados')
        .update({
          status: 'CONCLUIDO' as any,
          tecnico_executor: execForm.tecnico_executor,
          cliente_acompanhante: execForm.cliente_acompanhante || null,
          laudo_texto: execForm.laudo_texto || null,
          observacoes_conclusao: execForm.observacoes_conclusao || null,
          laudo_fotos: execFotos,
          data_conclusao: new Date().toISOString(),
          historico: newHistorico as any,
        })
        .eq('id', execChamado.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Chamado concluído com sucesso!' });
      setExecDialogOpen(false);
      setExecChamado(null);
      fetchChamados();
    } catch (error) {
      console.error('Error concluding chamado:', error);
      toast({ title: 'Erro', description: 'Erro ao concluir chamado', variant: 'destructive' });
    }
  };

  const executarAgendaPreventiva = async (agenda: AgendaPreventiva) => {
    try {
      const { error: chamadoError } = await supabase
        .from('manutencao_chamados')
        .insert({
          customer_id: agenda.customer_id,
          contrato: agenda.contrato,
          razao_social: agenda.razao_social,
          tipo: 'PREVENTIVO',
          descricao: agenda.descricao,
          equipamentos: agenda.equipamentos,
          tecnico_responsavel: agenda.tecnico_responsavel,
          data_agendada: agenda.proxima_execucao,
          praca: agenda.praca,
          historico: [{ data: new Date().toISOString(), acao: 'Chamado preventivo gerado manualmente', usuario: user?.nome || 'Sistema' }],
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (chamadoError) throw chamadoError;

      const proximaData = new Date(agenda.proxima_execucao);
      let novaProximaExecucao: Date;

      switch (agenda.frequencia) {
        case 'SEMANAL': novaProximaExecucao = addWeeks(proximaData, 1); break;
        case 'QUINZENAL': novaProximaExecucao = addWeeks(proximaData, 2); break;
        case 'MENSAL': novaProximaExecucao = addMonths(proximaData, 1); break;
        case 'BIMESTRAL': novaProximaExecucao = addMonths(proximaData, 2); break;
        case 'TRIMESTRAL': novaProximaExecucao = addMonths(proximaData, 3); break;
        case 'SEMESTRAL': novaProximaExecucao = addMonths(proximaData, 6); break;
        case 'ANUAL': novaProximaExecucao = addMonths(proximaData, 12); break;
        default: novaProximaExecucao = addMonths(proximaData, 1);
      }

      const { error: agendaError } = await supabase
        .from('manutencao_agendas_preventivas')
        .update({
          ultima_execucao: agenda.proxima_execucao,
          proxima_execucao: format(novaProximaExecucao, 'yyyy-MM-dd'),
        })
        .eq('id', agenda.id);

      if (agendaError) throw agendaError;

      toast({ title: 'Sucesso', description: 'Chamado preventivo criado e agenda atualizada' });
      fetchChamados();
      fetchAgendas();
    } catch (error) {
      console.error('Error executing agenda:', error);
      toast({ title: 'Erro', description: 'Erro ao executar agenda preventiva', variant: 'destructive' });
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

  // Filter: Only open chamados (not CONCLUIDO or CANCELADO)
  const openChamados = chamados.filter(c => c.status !== 'CONCLUIDO' && c.status !== 'CANCELADO');
  const concluidos = chamados.filter(c => c.status === 'CONCLUIDO');

  // Metrics based on open chamados
  const preventivos = openChamados.filter(c => c.tipo === 'PREVENTIVO').length;
  const eletivos = openChamados.filter(c => c.tipo === 'ELETIVO').length;
  const corretivos = openChamados.filter(c => c.tipo === 'CORRETIVO').length;
  const emAndamento = openChamados.filter(c => c.status === 'EM_ANDAMENTO').length;
  const agendados = openChamados.filter(c => c.status === 'AGENDADO').length;

  // Filter open chamados
  const filteredOpen = openChamados.filter(c => {
    const matchesSearch = 
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tecnico_responsavel && c.tecnico_responsavel.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTipo = filterTipo === 'all' || c.tipo === filterTipo;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesTipo && matchesStatus;
  });

  // Filter concluidos
  const [searchConcluidos, setSearchConcluidos] = useState('');
  const filteredConcluidos = concluidos.filter(c => {
    return c.razao_social.toLowerCase().includes(searchConcluidos.toLowerCase()) ||
      c.contrato.toLowerCase().includes(searchConcluidos.toLowerCase()) ||
      (c.tecnico_executor && c.tecnico_executor.toLowerCase().includes(searchConcluidos.toLowerCase()));
  });

  const canManage = ['admin', 'supervisor_operacoes', 'implantacao'].includes(user?.role || '');

  const handleExportChamadosPDF = () => {
    exportChamadosPDF(openChamados as any, 'Chamados_Manutencao');
  };

  const handleExportChamadosXLSX = () => {
    exportChamadosXLSX(openChamados as any, 'Chamados_Manutencao');
  };

  const handleExportConcluidosPDF = () => {
    exportChamadosPDF(concluidos as any, 'Chamados_Concluidos');
  };

  const handleExportConcluidosXLSX = () => {
    exportChamadosXLSX(concluidos as any, 'Chamados_Concluidos');
  };

  return (
    <div className="space-y-6">
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
              <DropdownMenuItem onClick={handleExportChamadosPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Chamados Abertos (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportChamadosXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Chamados Abertos (Excel)
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={handleExportConcluidosPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Concluídos (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportConcluidosXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Concluídos (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <>
            <Dialog open={agendaDialogOpen} onOpenChange={setAgendaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Nova Agenda Preventiva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Agenda Preventiva</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAgendaSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select onValueChange={(v) => handleCustomerSelect(v, 'agenda')} value={agendaForm.customer_id}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>{customer.razao_social} - {customer.contrato}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frequência *</Label>
                      <Select onValueChange={(v) => setAgendaForm(prev => ({ ...prev, frequencia: v as typeof prev.frequencia }))} value={agendaForm.frequencia}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(FREQUENCIA_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Próxima Execução *</Label>
                      <Input type="date" value={agendaForm.proxima_execucao} onChange={(e) => setAgendaForm(prev => ({ ...prev, proxima_execucao: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Textarea value={agendaForm.descricao} onChange={(e) => setAgendaForm(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva as atividades" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Equipamentos</Label>
                      <Input value={agendaForm.equipamentos} onChange={(e) => setAgendaForm(prev => ({ ...prev, equipamentos: e.target.value }))} placeholder="Equipamentos envolvidos" />
                    </div>
                    <div className="space-y-2">
                      <Label>Técnico Responsável</Label>
                      <Input value={agendaForm.tecnico_responsavel} onChange={(e) => setAgendaForm(prev => ({ ...prev, tecnico_responsavel: e.target.value }))} placeholder="Nome do técnico" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAgendaDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Criar Agenda</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

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
                    <Select onValueChange={(v) => handleCustomerSelect(v, 'chamado')} value={chamadoForm.customer_id}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>{customer.razao_social} - {customer.contrato}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contrato *</Label>
                      <Input value={chamadoForm.contrato} onChange={(e) => setChamadoForm(prev => ({ ...prev, contrato: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Razão Social *</Label>
                      <Input value={chamadoForm.razao_social} onChange={(e) => setChamadoForm(prev => ({ ...prev, razao_social: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select onValueChange={(v) => setChamadoForm(prev => ({ ...prev, tipo: v as typeof prev.tipo }))} value={chamadoForm.tipo}>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_LABELS).map(([value, { label, icon }]) => (
                            <SelectItem key={value} value={value}><span className="flex items-center gap-2">{icon} {label}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Técnico Responsável</Label>
                      <Input value={chamadoForm.tecnico_responsavel} onChange={(e) => setChamadoForm(prev => ({ ...prev, tecnico_responsavel: e.target.value }))} placeholder="Nome do técnico" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Agendada *</Label>
                      <Input type="date" value={chamadoForm.data_agendada} onChange={(e) => setChamadoForm(prev => ({ ...prev, data_agendada: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de Conclusão</Label>
                      <Input type="date" value={chamadoForm.data_previsao_conclusao} onChange={(e) => setChamadoForm(prev => ({ ...prev, data_previsao_conclusao: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipamentos</Label>
                    <Input value={chamadoForm.equipamentos} onChange={(e) => setChamadoForm(prev => ({ ...prev, equipamentos: e.target.value }))} placeholder="Equipamentos envolvidos" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={chamadoForm.descricao} onChange={(e) => setChamadoForm(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva o chamado" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Registrar Chamado</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-status-analysis" />
              <div>
                <p className="text-2xl font-bold">{preventivos}</p>
                <p className="text-xs text-muted-foreground">Preventivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{eletivos}</p>
                <p className="text-xs text-muted-foreground">Eletivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{corretivos}</p>
                <p className="text-xs text-muted-foreground">Corretivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-status-sent" />
              <div>
                <p className="text-2xl font-bold">{agendados}</p>
                <p className="text-xs text-muted-foreground">Agendados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-status-approved" />
              <div>
                <p className="text-2xl font-bold">{concluidos.length}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="chamados">Chamados Abertos ({openChamados.length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          <TabsTrigger value="agendas">Agendas Preventivas</TabsTrigger>
        </TabsList>

        <TabsContent value="chamados" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente, contrato ou técnico..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    {Object.entries(TIPO_LABELS).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="AGENDADO">Agendado</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="REAGENDADO">Reagendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Chamados Table */}
          <Card>
            <CardContent className="p-0">
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
                  {filteredOpen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum chamado aberto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOpen.map((chamado) => {
                      const tipoInfo = TIPO_LABELS[chamado.tipo];
                      const statusInfo = STATUS_LABELS[chamado.status];
                      return (
                        <TableRow key={chamado.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{chamado.razao_social}</TableCell>
                          <TableCell>{chamado.contrato}</TableCell>
                          <TableCell>
                            <Badge className={`${tipoInfo.color} text-white flex items-center gap-1 w-fit`}>
                              {tipoInfo.icon}
                              {tipoInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusInfo.color} text-white flex items-center gap-1 w-fit`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{chamado.praca || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(chamado.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{chamado.tecnico_responsavel || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" className="bg-status-approved hover:bg-status-approved/90" onClick={() => openExecDialog(chamado)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Executar
                              </Button>
                              {canManage && (
                                <Select value={chamado.status} onValueChange={(v) => handleStatusChange(chamado.id, v)}>
                                  <SelectTrigger className="w-28 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AGENDADO">Agendado</SelectItem>
                                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                                    <SelectItem value="REAGENDADO">Reagendado</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Concluídos Tab */}
        <TabsContent value="concluidos" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por cliente, contrato ou executor..." value={searchConcluidos} onChange={(e) => setSearchConcluidos(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Executor</TableHead>
                    <TableHead>Acompanhante</TableHead>
                    <TableHead>Data Conclusão</TableHead>
                    <TableHead>Laudo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConcluidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum chamado concluído
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConcluidos.map((chamado) => {
                      const tipoInfo = TIPO_LABELS[chamado.tipo];
                      return (
                        <TableRow key={chamado.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{chamado.razao_social}</TableCell>
                          <TableCell>{chamado.contrato}</TableCell>
                          <TableCell>
                            <Badge className={`${tipoInfo.color} text-white flex items-center gap-1 w-fit`}>
                              {tipoInfo.icon}
                              {tipoInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{chamado.tecnico_executor || chamado.tecnico_responsavel || '-'}</TableCell>
                          <TableCell>{chamado.cliente_acompanhante || '-'}</TableCell>
                          <TableCell>
                            {chamado.data_conclusao ? format(new Date(chamado.data_conclusao), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {chamado.laudo_texto && <Badge variant="outline" className="text-xs">Texto</Badge>}
                              {(chamado.laudo_fotos || []).length > 0 && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Image className="h-3 w-3" />
                                  {(chamado.laudo_fotos || []).length}
                                </Badge>
                              )}
                              {!chamado.laudo_texto && (chamado.laudo_fotos || []).length === 0 && '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Agendas de Manutenção Preventiva
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Próxima Execução</TableHead>
                    <TableHead>Última Execução</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        Nenhuma agenda preventiva cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    agendas.map((agenda) => (
                      <TableRow key={agenda.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agenda.razao_social}</p>
                            <p className="text-xs text-muted-foreground">{agenda.contrato}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{agenda.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{FREQUENCIA_LABELS[agenda.frequencia]}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(agenda.proxima_execucao), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {agenda.ultima_execucao 
                            ? format(new Date(agenda.ultima_execucao), "dd/MM/yyyy", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={agenda.ativo ? 'default' : 'secondary'}>
                            {agenda.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => executarAgendaPreventiva(agenda)} disabled={!agenda.ativo}>
                                Executar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleAgendaAtivo(agenda.id, !agenda.ativo)}>
                                {agenda.ativo ? 'Desativar' : 'Ativar'}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Dialog */}
      <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-status-approved" />
              Concluir Chamado
            </DialogTitle>
          </DialogHeader>
          {execChamado && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-semibold">{execChamado.razao_social}</p>
                <p className="text-sm text-muted-foreground">Contrato: {execChamado.contrato} | Tipo: {TIPO_LABELS[execChamado.tipo]?.label} | Agendado: {format(new Date(execChamado.data_agendada), "dd/MM/yyyy")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quem executou? *</Label>
                  <Input value={execForm.tecnico_executor} onChange={e => setExecForm(prev => ({ ...prev, tecnico_executor: e.target.value }))} placeholder="Nome do técnico executor" />
                </div>
                <div className="space-y-2">
                  <Label>Cliente que acompanhou</Label>
                  <Input value={execForm.cliente_acompanhante} onChange={e => setExecForm(prev => ({ ...prev, cliente_acompanhante: e.target.value }))} placeholder="Nome do acompanhante do cliente" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Laudo / Descrição da execução</Label>
                <Textarea value={execForm.laudo_texto} onChange={e => setExecForm(prev => ({ ...prev, laudo_texto: e.target.value }))} placeholder="Descreva o que foi realizado, observações..." rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Observações adicionais</Label>
                <Textarea value={execForm.observacoes_conclusao} onChange={e => setExecForm(prev => ({ ...prev, observacoes_conclusao: e.target.value }))} placeholder="Observações..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Fotos do Laudo</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadLaudoFoto} disabled={uploading} />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span><Upload className="h-4 w-4 mr-2" />{uploading ? 'Enviando...' : 'Adicionar Foto'}</span>
                    </Button>
                  </label>
                </div>
                {execFotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {execFotos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Laudo ${i + 1}`} className="w-full h-24 object-cover rounded border" />
                        <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFoto(i)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setExecDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleExecSubmit} className="bg-status-approved hover:bg-status-approved/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir Chamado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
