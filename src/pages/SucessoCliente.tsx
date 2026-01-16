import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, addMonths, isBefore, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  unidades: number | null;
  data_ativacao: string | null;
  data_termino: string | null;
}

export default function SucessoCliente() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringDialogOpen, setExpiringDialogOpen] = useState(false);
  const [expiringDialogData, setExpiringDialogData] = useState<{ title: string; customers: Customer[] }>({ title: '', customers: [] });
  const [customersDialogOpen, setCustomersDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionDialogType, setActionDialogType] = useState<'reclamacao' | 'nps' | 'depoimento' | 'satisfacao' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
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
    setExpiringDialogOpen(true);
  };

  const handleOpenActionDialog = (type: 'reclamacao' | 'nps' | 'depoimento' | 'satisfacao') => {
    setActionDialogType(type);
    setSearchTerm('');
    setActionDialogOpen(true);
  };

  const getActionDialogTitle = () => {
    switch (actionDialogType) {
      case 'reclamacao': return 'Selecionar Cliente para Abrir Reclamação';
      case 'nps': return 'Selecionar Cliente para Pesquisa NPS';
      case 'depoimento': return 'Selecionar Cliente para Registrar Depoimento';
      case 'satisfacao': return 'Selecionar Cliente para Pesquisa de Satisfação';
      default: return 'Selecionar Cliente';
    }
  };

  const getActionParam = () => {
    switch (actionDialogType) {
      case 'reclamacao': return 'reclamacao';
      case 'nps': return 'nps';
      case 'depoimento': return 'depoimento';
      case 'satisfacao': return 'satisfacao';
      default: return '';
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.filial && c.filial.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                  <p className="text-2xl font-bold">--</p>
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
                  <p className="text-2xl font-bold">--</p>
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
            onClick={() => handleOpenActionDialog('reclamacao')}
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
                <p>Nenhum chamado registrado</p>
                <p className="text-sm">Os chamados de reclamações aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>

          {/* NPS Surveys */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOpenActionDialog('nps')}
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
                <p>Nenhuma pesquisa registrada</p>
                <p className="text-sm">As pesquisas de NPS aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials and Satisfaction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Testimonials */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOpenActionDialog('depoimento')}
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
                <p>Nenhum depoimento registrado</p>
                <p className="text-sm">Os depoimentos dos síndicos aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>

          {/* Satisfaction Index */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleOpenActionDialog('satisfacao')}
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
                <p>Sem dados de satisfação</p>
                <p className="text-sm">Os índices de satisfação aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog for customers list */}
        <Dialog open={customersDialogOpen} onOpenChange={setCustomersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lista de Clientes</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, contrato ou filial..."
                  className="pl-10"
                  id="customer-search"
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
                {customers.map((customer) => (
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
            {expiringDialogData.customers.length === 0 ? (
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
                  {expiringDialogData.customers.map((customer) => (
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

        {/* Dialog for action selection */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
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
                      setActionDialogOpen(false);
                      navigate(`/sucesso-cliente/${customer.id}?action=${getActionParam()}`);
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
