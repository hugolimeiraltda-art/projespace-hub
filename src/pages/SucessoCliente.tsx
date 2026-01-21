import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Building2, 
  CalendarClock, 
  AlertTriangle, 
  MessageSquare, 
  ThumbsUp, 
  Star,
  TrendingUp,
  RefreshCw,
  Loader2,
  Search,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, addMonths, isBefore, isAfter, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  unidades: number | null;
  data_ativacao: string | null;
  data_termino: string | null;
}

interface CustomerPortfolioRef {
  razao_social: string;
  contrato: string;
  filial?: string | null;
}

interface Chamado {
  id: string;
  customer_id: string;
  assunto: string;
  prioridade: string;
  status: string;
  created_at: string;
  customer_portfolio?: CustomerPortfolioRef;
}

interface NpsSurvey {
  id: string;
  customer_id: string;
  nota: number;
  comentario: string | null;
  ponto_forte: string | null;
  ponto_fraco: string | null;
  created_at: string;
  customer_portfolio?: CustomerPortfolioRef;
}

interface Depoimento {
  id: string;
  customer_id: string;
  texto: string;
  autor: string;
  cargo: string | null;
  tipo: string;
  created_at: string;
  customer_portfolio?: CustomerPortfolioRef;
}

interface Satisfacao {
  id: string;
  customer_id: string;
  nota_nps: number | null;
  tempo_implantacao: string | null;
  facilidade_app: string | null;
  treinamento_adequado: string | null;
  expectativa_atendida: string | null;
  created_at: string;
  customer_portfolio?: CustomerPortfolioRef;
}

interface Pendencia {
  id: string;
  numero_os: string;
  customer_id: string | null;
  contrato: string;
  razao_social: string;
  numero_ticket: string | null;
  tipo: string;
  setor: string;
  descricao: string | null;
  status: string;
  sla_dias: number;
  data_abertura: string;
  data_prazo: string;
  data_conclusao: string | null;
}

export default function SucessoCliente() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringDialogOpen, setExpiringDialogOpen] = useState(false);
  const [expiringDialogData, setExpiringDialogData] = useState<{ title: string; customers: Customer[] }>({ title: '', customers: [] });
  const [customersDialogOpen, setCustomersDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New dialog states for each card
  const [chamadosDialogOpen, setChamadosDialogOpen] = useState(false);
  const [npsDialogOpen, setNpsDialogOpen] = useState(false);
  const [depoimentosDialogOpen, setDepoimentosDialogOpen] = useState(false);
  const [satisfacaoDialogOpen, setSatisfacaoDialogOpen] = useState(false);

  // Data states
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [npsSurveys, setNpsSurveys] = useState<NpsSurvey[]>([]);
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [satisfacaoData, setSatisfacaoData] = useState<Satisfacao[]>([]);
  const [pendenciasClientes, setPendenciasClientes] = useState<Pendencia[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Satisfaction period filter
  const [satisfacaoPeriodo, setSatisfacaoPeriodo] = useState('12');

  // Filial multi-select filters for each dialog
  const [customersFilialFilter, setCustomersFilialFilter] = useState<string[]>([]);
  const [expiringFilialFilter, setExpiringFilialFilter] = useState<string[]>([]);
  const [chamadosFilialFilter, setChamadosFilialFilter] = useState<string[]>([]);
  const [npsFilialFilter, setNpsFilialFilter] = useState<string[]>([]);
  const [depoimentosFilialFilter, setDepoimentosFilialFilter] = useState<string[]>([]);
  const [satisfacaoFilialFilter, setSatisfacaoFilialFilter] = useState<string[]>([]);
  const [customerSelectFilialFilter, setCustomerSelectFilialFilter] = useState<string[]>([]);

  // Customer selection dialog
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [customerSelectAction, setCustomerSelectAction] = useState<'reclamacao' | 'nps' | 'depoimento' | 'satisfacao' | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchPendenciasClientes();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, filial, unidades, data_ativacao, data_termino')
        .order('contrato', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a carteira de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChamados = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('customer_chamados')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error('Error fetching chamados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchNpsSurveys = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('customer_nps')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNpsSurveys(data || []);
    } catch (error) {
      console.error('Error fetching NPS:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchDepoimentos = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('customer_depoimentos')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepoimentos(data || []);
    } catch (error) {
      console.error('Error fetching depoimentos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSatisfacao = async (meses: number) => {
    setLoadingData(true);
    try {
      const dataInicio = subMonths(new Date(), meses).toISOString();
      const { data, error } = await supabase
        .from('customer_satisfacao')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .gte('created_at', dataInicio)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSatisfacaoData(data || []);
    } catch (error) {
      console.error('Error fetching satisfacao:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPendenciasClientes = async () => {
    try {
      // Buscar pendências de cliente (tipos CLIENTE_*)
      const { data, error } = await supabase
        .from('manutencao_pendencias')
        .select('*')
        .in('tipo', ['CLIENTE_OBRA', 'CLIENTE_AGENDA', 'CLIENTE_LIMPEZA_VEGETACAO', 'CLIENTE_CONTRATACAO_SERVICOS'])
        .in('status', ['ABERTO', 'EM_ANDAMENTO'])
        .order('data_prazo', { ascending: true });

      if (error) throw error;
      setPendenciasClientes(data || []);
    } catch (error) {
      console.error('Error fetching pendencias:', error);
    }
  };

  const handleOpenChamados = () => {
    fetchChamados();
    setChamadosDialogOpen(true);
  };

  const handleOpenNps = () => {
    fetchNpsSurveys();
    setNpsDialogOpen(true);
  };

  const handleOpenDepoimentos = () => {
    fetchDepoimentos();
    setDepoimentosDialogOpen(true);
  };

  const handleOpenSatisfacao = () => {
    fetchSatisfacao(parseInt(satisfacaoPeriodo));
    setSatisfacaoDialogOpen(true);
  };

  // Open customer selection dialog
  const openCustomerSelect = (action: 'reclamacao' | 'nps' | 'depoimento' | 'satisfacao') => {
    setCustomerSelectAction(action);
    setSearchTerm('');
    setCustomerSelectDialogOpen(true);
  };

  // Calculate contracts expiring
  const now = new Date();
  const in3Months = addMonths(now, 3);
  const in6Months = addMonths(now, 6);
  const in1Year = addMonths(now, 12);

  const getContractEndDate = (customer: Customer): Date | null => {
    if (customer.data_termino) {
      return parseISO(customer.data_termino);
    }
    if (customer.data_ativacao) {
      return addMonths(parseISO(customer.data_ativacao), 36);
    }
    return null;
  };

  const contractsExpiring3Months = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, now) && isBefore(endDate, in3Months);
  });

  const contractsExpiring6Months = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, in3Months) && isBefore(endDate, in6Months);
  });

  const contractsExpiring1Year = customers.filter(c => {
    const endDate = getContractEndDate(c);
    return endDate && isAfter(endDate, in6Months) && isBefore(endDate, in1Year);
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateTermino = (customer: Customer) => {
    if (customer.data_termino) {
      return formatDate(customer.data_termino);
    }
    if (!customer.data_ativacao) return '-';
    try {
      const dataInicio = new Date(customer.data_ativacao);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleOpenExpiringDialog = (title: string, customersList: Customer[]) => {
    setExpiringDialogData({ title, customers: customersList });
    setExpiringFilialFilter([]);
    setExpiringDialogOpen(true);
  };

  // Get all unique filiais from customers
  const allFiliais = useMemo(() => {
    return [...new Set(customers.map(c => c.filial).filter((f): f is string => !!f && f.trim() !== ''))].sort();
  }, [customers]);

  // Filtered customers for customer list dialog (text + filial filter)
  const filteredCustomersDialog = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.filial && c.filial.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilial = customersFilialFilter.length === 0 || 
        (c.filial && customersFilialFilter.includes(c.filial));
      
      return matchesSearch && matchesFilial;
    });
  }, [customers, searchTerm, customersFilialFilter]);

  // Filtered expiring contracts
  const filteredExpiringCustomers = useMemo(() => {
    return expiringDialogData.customers.filter(c => {
      return expiringFilialFilter.length === 0 || 
        (c.filial && expiringFilialFilter.includes(c.filial));
    });
  }, [expiringDialogData.customers, expiringFilialFilter]);

  // Filtered chamados
  const filteredChamados = useMemo(() => {
    return chamados.filter(c => {
      return chamadosFilialFilter.length === 0 || 
        (c.customer_portfolio?.filial && chamadosFilialFilter.includes(c.customer_portfolio.filial));
    });
  }, [chamados, chamadosFilialFilter]);

  // Filtered NPS surveys
  const filteredNpsSurveys = useMemo(() => {
    return npsSurveys.filter(n => {
      return npsFilialFilter.length === 0 || 
        (n.customer_portfolio?.filial && npsFilialFilter.includes(n.customer_portfolio.filial));
    });
  }, [npsSurveys, npsFilialFilter]);

  // Filtered depoimentos
  const filteredDepoimentos = useMemo(() => {
    return depoimentos.filter(d => {
      return depoimentosFilialFilter.length === 0 || 
        (d.customer_portfolio?.filial && depoimentosFilialFilter.includes(d.customer_portfolio.filial));
    });
  }, [depoimentos, depoimentosFilialFilter]);

  // Filtered satisfacao
  const filteredSatisfacao = useMemo(() => {
    return satisfacaoData.filter(s => {
      return satisfacaoFilialFilter.length === 0 || 
        (s.customer_portfolio?.filial && satisfacaoFilialFilter.includes(s.customer_portfolio.filial));
    });
  }, [satisfacaoData, satisfacaoFilialFilter]);

  // Filtered customer select
  const filteredCustomerSelect = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.filial && c.filial.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilial = customerSelectFilialFilter.length === 0 || 
        (c.filial && customerSelectFilialFilter.includes(c.filial));
      
      return matchesSearch && matchesFilial;
    });
  }, [customers, searchTerm, customerSelectFilialFilter]);

  const filteredCustomers = customers.filter(c => 
    c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.filial && c.filial.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // NPS calculations
  const getNpsCategory = (nota: number) => {
    if (nota >= 9) return 'promoter';
    if (nota >= 7) return 'neutral';
    return 'detractor';
  };

  const promoters = npsSurveys.filter(n => getNpsCategory(n.nota) === 'promoter');
  const detractors = npsSurveys.filter(n => getNpsCategory(n.nota) === 'detractor');
  const npsScore = npsSurveys.length > 0 
    ? Math.round(((promoters.length - detractors.length) / npsSurveys.length) * 100)
    : null;

  // Satisfaction calculations
  const satisfacaoMedia = satisfacaoData.length > 0
    ? (satisfacaoData.filter(s => s.nota_nps).reduce((acc, s) => acc + (s.nota_nps || 0), 0) / satisfacaoData.filter(s => s.nota_nps).length).toFixed(1)
    : null;

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return <Badge variant="destructive">Urgente</Badge>;
      case 'alta': return <Badge className="bg-orange-500">Alta</Badge>;
      case 'media': return <Badge className="bg-yellow-500">Média</Badge>;
      case 'baixa': return <Badge className="bg-green-500">Baixa</Badge>;
      default: return <Badge>{prioridade}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto': return <Badge variant="outline" className="border-red-500 text-red-500">Aberto</Badge>;
      case 'em_andamento': return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Em Andamento</Badge>;
      case 'resolvido': return <Badge variant="outline" className="border-green-500 text-green-500">Resolvido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionDialogTitle = () => {
    switch (customerSelectAction) {
      case 'reclamacao': return 'Selecionar Cliente para Abrir Reclamação';
      case 'nps': return 'Selecionar Cliente para Pesquisa NPS';
      case 'depoimento': return 'Selecionar Cliente para Registrar Depoimento';
      case 'satisfacao': return 'Selecionar Cliente para Pesquisa de Satisfação';
      default: return 'Selecionar Cliente';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Calculate totals
  const totalUnidades = customers.reduce((acc, c) => acc + (c.unidades || 0), 0);
  const chamadosAbertos = chamados.filter(c => c.status === 'aberto').length;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Sucesso do Cliente</h1>
          <p className="text-muted-foreground">Acompanhe renovações, satisfação e feedback dos clientes</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setCustomersDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clientes</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Unidades</p>
                  <p className="text-2xl font-bold">{totalUnidades.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Índice de Satisfação</p>
                  <p className="text-2xl font-bold">{satisfacaoMedia || '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NPS Médio</p>
                  <p className="text-2xl font-bold">{npsScore !== null ? npsScore : '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract Expiration Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Renovações de Contratos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenExpiringDialog('Contratos vencendo em 3 meses', contractsExpiring3Months)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencendo em 3 meses</p>
                    <p className="text-2xl font-bold text-red-600">{contractsExpiring3Months.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenExpiringDialog('Contratos vencendo em 6 meses', contractsExpiring6Months)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <CalendarClock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencendo em 6 meses</p>
                    <p className="text-2xl font-bold text-amber-600">{contractsExpiring6Months.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenExpiringDialog('Contratos vencendo em 1 ano', contractsExpiring1Year)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarClock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencendo em 1 ano</p>
                    <p className="text-2xl font-bold text-blue-600">{contractsExpiring1Year.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tickets and Feedback Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Open Tickets */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleOpenChamados}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Chamados / Reclamações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Clique para ver chamados</p>
                <p className="text-sm">Visualize e gerencie reclamações</p>
              </div>
            </CardContent>
          </Card>

          {/* NPS Surveys */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleOpenNps}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-500" />
                Pesquisas de NPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Clique para ver pesquisas</p>
                <p className="text-sm">Promotores, detratores e pontos fortes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials and Satisfaction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Testimonials */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleOpenDepoimentos}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-500" />
                Depoimentos e Elogios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ThumbsUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Clique para ver depoimentos</p>
                <p className="text-sm">Elogios e feedbacks positivos</p>
              </div>
            </CardContent>
          </Card>

          {/* Satisfaction Index */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleOpenSatisfacao}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Índice de Satisfação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Clique para ver índices</p>
                <p className="text-sm">Análise por período (3, 6, 9, 12 meses)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pendências de Clientes Section */}
        {pendenciasClientes.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-pending" />
              Pendências de Clientes ({pendenciasClientes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendenciasClientes.slice(0, 6).map((pendencia) => {
                const hoje = new Date();
                const prazo = new Date(pendencia.data_prazo);
                const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                const isAtrasado = diasRestantes < 0;
                const isUrgente = diasRestantes >= 0 && diasRestantes <= 2;

                return (
                  <Card 
                    key={pendencia.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      isAtrasado ? 'border-l-4 border-l-destructive' : 
                      isUrgente ? 'border-l-4 border-l-status-pending' : 
                      'border-l-4 border-l-primary'
                    }`}
                    onClick={() => navigate('/manutencao')}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{pendencia.razao_social}</h3>
                        <Badge variant={pendencia.status === 'ABERTO' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                          {pendencia.status === 'ABERTO' ? 'Aberto' : 'Em Andamento'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Contrato: {pendencia.contrato}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        OS: {pendencia.numero_os} {pendencia.numero_ticket && `• Ticket: ${pendencia.numero_ticket}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {pendencia.tipo.replace('CLIENTE_', '').replace('_', ' ')}
                        </Badge>
                        <span className={`text-xs font-medium ${
                          isAtrasado ? 'text-destructive' : 
                          isUrgente ? 'text-status-pending' : 
                          'text-muted-foreground'
                        }`}>
                          {isAtrasado 
                            ? `Atrasado ${Math.abs(diasRestantes)} dias` 
                            : diasRestantes === 0 
                              ? 'Vence hoje' 
                              : `${diasRestantes} dias restantes`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {pendenciasClientes.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => navigate('/manutencao')}>
                  Ver todas as {pendenciasClientes.length} pendências
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dialog for customers list */}
        <Dialog open={customersDialogOpen} onOpenChange={setCustomersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lista de Clientes</DialogTitle>
            </DialogHeader>
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, contrato ou filial..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={customersFilialFilter}
                onSelectionChange={setCustomersFilialFilter}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Unidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomersDialog.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setCustomersDialogOpen(false);
                      navigate(`/sucesso-cliente/${customer.id}`);
                    }}
                  >
                    <TableCell className="font-medium text-primary">{customer.contrato}</TableCell>
                    <TableCell>{customer.razao_social}</TableCell>
                    <TableCell>{customer.filial || '-'}</TableCell>
                    <TableCell>{customer.unidades || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        {/* Dialog for expiring contracts */}
        <Dialog open={expiringDialogOpen} onOpenChange={setExpiringDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{expiringDialogData.title}</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={expiringFilialFilter}
                onSelectionChange={setExpiringFilialFilter}
              />
            </div>
            {filteredExpiringCustomers.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">Nenhum contrato encontrado neste período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Término</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpiringCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setExpiringDialogOpen(false);
                        navigate(`/sucesso-cliente/${customer.id}`);
                      }}
                    >
                      <TableCell className="font-medium text-primary">{customer.contrato}</TableCell>
                      <TableCell>{customer.razao_social}</TableCell>
                      <TableCell>{customer.filial || '-'}</TableCell>
                      <TableCell>{calculateTermino(customer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        {/* Chamados Dialog */}
        <Dialog open={chamadosDialogOpen} onOpenChange={setChamadosDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  Chamados / Reclamações
                </span>
                <Button size="sm" onClick={() => { setChamadosDialogOpen(false); openCustomerSelect('reclamacao'); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Chamado
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="my-4">
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={chamadosFilialFilter}
                onSelectionChange={setChamadosFilialFilter}
              />
            </div>
            
            <Tabs defaultValue="abertos" className="mt-2">
              <TabsList>
                <TabsTrigger value="abertos">Abertos ({filteredChamados.filter(c => c.status === 'aberto').length})</TabsTrigger>
                <TabsTrigger value="andamento">Em Andamento ({filteredChamados.filter(c => c.status === 'em_andamento').length})</TabsTrigger>
                <TabsTrigger value="resolvidos">Resolvidos ({filteredChamados.filter(c => c.status === 'resolvido').length})</TabsTrigger>
                <TabsTrigger value="todos">Todos ({filteredChamados.length})</TabsTrigger>
              </TabsList>

              {['abertos', 'andamento', 'resolvidos', 'todos'].map(tab => (
                <TabsContent key={tab} value={tab}>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChamados
                          .filter(c => tab === 'todos' || 
                            (tab === 'abertos' && c.status === 'aberto') ||
                            (tab === 'andamento' && c.status === 'em_andamento') ||
                            (tab === 'resolvidos' && c.status === 'resolvido'))
                          .map((chamado) => (
                          <TableRow key={chamado.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{chamado.customer_portfolio?.razao_social}</p>
                                <p className="text-sm text-muted-foreground">{chamado.customer_portfolio?.contrato}</p>
                              </div>
                            </TableCell>
                            <TableCell>{chamado.assunto}</TableCell>
                            <TableCell>{getPrioridadeBadge(chamado.prioridade)}</TableCell>
                            <TableCell>{getStatusBadge(chamado.status)}</TableCell>
                            <TableCell>{formatDate(chamado.created_at)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/sucesso-cliente/${chamado.customer_id}`)}>
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredChamados.filter(c => tab === 'todos' || 
                            (tab === 'abertos' && c.status === 'aberto') ||
                            (tab === 'andamento' && c.status === 'em_andamento') ||
                            (tab === 'resolvidos' && c.status === 'resolvido')).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhum chamado encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* NPS Dialog */}
        <Dialog open={npsDialogOpen} onOpenChange={setNpsDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Pesquisas de NPS
                </span>
                <Button size="sm" onClick={() => { setNpsDialogOpen(false); openCustomerSelect('nps'); }}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Pesquisa
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="my-4">
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={npsFilialFilter}
                onSelectionChange={setNpsFilialFilter}
              />
            </div>

            {/* NPS Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {filteredNpsSurveys.length > 0 
                      ? Math.round(((filteredNpsSurveys.filter(n => getNpsCategory(n.nota) === 'promoter').length - filteredNpsSurveys.filter(n => getNpsCategory(n.nota) === 'detractor').length) / filteredNpsSurveys.length) * 100)
                      : '--'}
                  </p>
                  <p className="text-sm text-muted-foreground">NPS Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{filteredNpsSurveys.filter(n => getNpsCategory(n.nota) === 'promoter').length}</p>
                  <p className="text-sm text-muted-foreground">Promotores (9-10)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{filteredNpsSurveys.filter(n => getNpsCategory(n.nota) === 'neutral').length}</p>
                  <p className="text-sm text-muted-foreground">Neutros (7-8)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{filteredNpsSurveys.filter(n => getNpsCategory(n.nota) === 'detractor').length}</p>
                  <p className="text-sm text-muted-foreground">Detratores (0-6)</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="detratores" className="mt-2">
              <TabsList>
                <TabsTrigger value="detratores">Detratores</TabsTrigger>
                <TabsTrigger value="promotores">Promotores</TabsTrigger>
                <TabsTrigger value="todos">Todos</TabsTrigger>
              </TabsList>

              {['detratores', 'promotores', 'todos'].map(tab => (
                <TabsContent key={tab} value={tab}>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead>Ponto Forte</TableHead>
                          <TableHead>Ponto Fraco</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNpsSurveys
                          .filter(n => tab === 'todos' || 
                            (tab === 'detratores' && getNpsCategory(n.nota) === 'detractor') ||
                            (tab === 'promotores' && getNpsCategory(n.nota) === 'promoter'))
                          .map((nps) => (
                          <TableRow key={nps.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{nps.customer_portfolio?.razao_social}</p>
                                <p className="text-sm text-muted-foreground">{nps.customer_portfolio?.contrato}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                getNpsCategory(nps.nota) === 'promoter' ? 'bg-green-500' :
                                getNpsCategory(nps.nota) === 'neutral' ? 'bg-yellow-500' : 'bg-red-500'
                              }>
                                {nps.nota}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-48 truncate">{nps.ponto_forte || '-'}</TableCell>
                            <TableCell className="max-w-48 truncate">{nps.ponto_fraco || '-'}</TableCell>
                            <TableCell>{formatDate(nps.created_at)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/sucesso-cliente/${nps.customer_id}`)}>
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredNpsSurveys.filter(n => tab === 'todos' || 
                            (tab === 'detratores' && getNpsCategory(n.nota) === 'detractor') ||
                            (tab === 'promotores' && getNpsCategory(n.nota) === 'promoter')).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma pesquisa encontrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Depoimentos Dialog */}
        <Dialog open={depoimentosDialogOpen} onOpenChange={setDepoimentosDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  Depoimentos e Elogios
                </span>
                <Button size="sm" onClick={() => { setDepoimentosDialogOpen(false); openCustomerSelect('depoimento'); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Depoimento
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="my-4">
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={depoimentosFilialFilter}
                onSelectionChange={setDepoimentosFilialFilter}
              />
            </div>

            <Tabs defaultValue="elogios" className="mt-2">
              <TabsList>
                <TabsTrigger value="elogios">Elogios ({filteredDepoimentos.filter(d => d.tipo === 'elogio').length})</TabsTrigger>
                <TabsTrigger value="sugestoes">Sugestões ({filteredDepoimentos.filter(d => d.tipo === 'sugestao').length})</TabsTrigger>
                <TabsTrigger value="todos">Todos ({filteredDepoimentos.length})</TabsTrigger>
              </TabsList>

              {['elogios', 'sugestoes', 'todos'].map(tab => (
                <TabsContent key={tab} value={tab}>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDepoimentos
                        .filter(d => tab === 'todos' || 
                          (tab === 'elogios' && d.tipo === 'elogio') ||
                          (tab === 'sugestoes' && d.tipo === 'sugestao'))
                        .map((dep) => (
                        <Card key={dep.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{dep.customer_portfolio?.razao_social}</p>
                                <p className="text-sm text-muted-foreground">{dep.customer_portfolio?.contrato}</p>
                              </div>
                              <Badge className={dep.tipo === 'elogio' ? 'bg-green-500' : 'bg-blue-500'}>
                                {dep.tipo === 'elogio' ? 'Elogio' : 'Sugestão'}
                              </Badge>
                            </div>
                            <blockquote className="border-l-4 border-primary pl-4 italic my-3">
                              "{dep.texto}"
                            </blockquote>
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>— {dep.autor}{dep.cargo ? `, ${dep.cargo}` : ''}</span>
                              <span>{formatDate(dep.created_at)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {filteredDepoimentos.filter(d => tab === 'todos' || 
                          (tab === 'elogios' && d.tipo === 'elogio') ||
                          (tab === 'sugestoes' && d.tipo === 'sugestao')).length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">Nenhum depoimento encontrado</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Satisfação Dialog */}
        <Dialog open={satisfacaoDialogOpen} onOpenChange={setSatisfacaoDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Índice de Satisfação
                </span>
                <div className="flex items-center gap-2">
                  <Select value={satisfacaoPeriodo} onValueChange={(v) => { setSatisfacaoPeriodo(v); fetchSatisfacao(parseInt(v)); }}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="9">9 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { setSatisfacaoDialogOpen(false); openCustomerSelect('satisfacao'); }}>
                    <Plus className="w-4 h-4 mr-1" /> Nova Pesquisa
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-3 my-4">
              <FilialMultiSelect
                filiais={allFiliais}
                selectedFiliais={satisfacaoFilialFilter}
                onSelectionChange={setSatisfacaoFilialFilter}
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-primary">{filteredSatisfacao.length}</p>
                  <p className="text-sm text-muted-foreground">Total Pesquisas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {filteredSatisfacao.filter(s => s.expectativa_atendida === 'sim').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Expectativa Atendida</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredSatisfacao.filter(s => s.facilidade_app === 'muito_satisfeito' || s.facilidade_app === 'satisfeito').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Satisfeitos com App</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {filteredSatisfacao.filter(s => s.treinamento_adequado === 'sim').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Treinamento OK</p>
                </CardContent>
              </Card>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota NPS</TableHead>
                    <TableHead>Tempo OK?</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Expectativa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSatisfacao.map((sat) => (
                    <TableRow key={sat.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sat.customer_portfolio?.razao_social}</p>
                          <p className="text-sm text-muted-foreground">{sat.customer_portfolio?.contrato}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sat.nota_nps && (
                          <Badge className={sat.nota_nps >= 9 ? 'bg-green-500' : sat.nota_nps >= 7 ? 'bg-yellow-500' : 'bg-red-500'}>
                            {sat.nota_nps}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sat.tempo_implantacao === 'sim' ? (
                          <Badge className="bg-green-500">Sim</Badge>
                        ) : sat.tempo_implantacao === 'nao' ? (
                          <Badge variant="destructive">Não</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {sat.facilidade_app === 'muito_satisfeito' ? (
                          <Badge className="bg-green-500">Muito Satisfeito</Badge>
                        ) : sat.facilidade_app === 'satisfeito' ? (
                          <Badge className="bg-blue-500">Satisfeito</Badge>
                        ) : sat.facilidade_app === 'indiferente' ? (
                          <Badge variant="outline">Indiferente</Badge>
                        ) : sat.facilidade_app === 'insatisfeito' ? (
                          <Badge variant="destructive">Insatisfeito</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {sat.treinamento_adequado === 'sim' ? (
                          <Badge className="bg-green-500">Sim</Badge>
                        ) : sat.treinamento_adequado === 'nao' ? (
                          <Badge variant="destructive">Não</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {sat.expectativa_atendida === 'sim' ? (
                          <Badge className="bg-green-500">Sim</Badge>
                        ) : sat.expectativa_atendida === 'nao' ? (
                          <Badge variant="destructive">Não</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(sat.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/sucesso-cliente/${sat.customer_id}`)}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {satisfacaoData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma pesquisa encontrada no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer Selection Dialog */}
        <Dialog open={customerSelectDialogOpen} onOpenChange={setCustomerSelectDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{getActionDialogTitle()}</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, contrato ou filial..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Unidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setCustomerSelectDialogOpen(false);
                      navigate(`/sucesso-cliente/${customer.id}?action=${customerSelectAction}`);
                    }}
                  >
                    <TableCell className="font-medium text-primary">{customer.contrato}</TableCell>
                    <TableCell>{customer.razao_social}</TableCell>
                    <TableCell>{customer.filial || '-'}</TableCell>
                    <TableCell>{customer.unidades || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
