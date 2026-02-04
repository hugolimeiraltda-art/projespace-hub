import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, ArrowLeft, Loader2, ExternalLink, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

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

export default function SucessoClienteChamados() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchChamados();
  }, []);

  const fetchChamados = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_chamados')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error('Error fetching chamados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar chamados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allFiliais = useMemo(() => {
    return [...new Set(chamados.map(c => c.customer_portfolio?.filial).filter((f): f is string => !!f))].sort();
  }, [chamados]);

  const filteredChamados = useMemo(() => {
    return chamados.filter(c => {
      return filialFilter.length === 0 || (c.customer_portfolio?.filial && filialFilter.includes(c.customer_portfolio.filial));
    });
  }, [chamados, filialFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const colors: Record<string, string> = {
      baixa: 'bg-gray-500', media: 'bg-yellow-500', alta: 'bg-orange-500', urgente: 'bg-red-500'
    };
    return <Badge className={colors[prioridade] || 'bg-gray-500'}>{prioridade}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      aberto: 'bg-red-500', em_andamento: 'bg-yellow-500', resolvido: 'bg-green-500'
    };
    const labels: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sucesso-cliente')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-orange-500" />
                Chamados / Reclamações
              </h1>
              <p className="text-muted-foreground">Visualize e gerencie todos os chamados de clientes</p>
            </div>
          </div>
          <Button onClick={() => navigate('/sucesso-cliente')}>
            <Plus className="w-4 h-4 mr-1" /> Novo Chamado
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <FilialMultiSelect filiais={allFiliais} selectedFiliais={filialFilter} onSelectionChange={setFilialFilter} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{filteredChamados.filter(c => c.status === 'aberto').length}</p>
            <p className="text-sm text-muted-foreground">Abertos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{filteredChamados.filter(c => c.status === 'em_andamento').length}</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{filteredChamados.filter(c => c.status === 'resolvido').length}</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{filteredChamados.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="abertos">
            <TabsList>
              <TabsTrigger value="abertos">Abertos ({filteredChamados.filter(c => c.status === 'aberto').length})</TabsTrigger>
              <TabsTrigger value="andamento">Em Andamento ({filteredChamados.filter(c => c.status === 'em_andamento').length})</TabsTrigger>
              <TabsTrigger value="resolvidos">Resolvidos ({filteredChamados.filter(c => c.status === 'resolvido').length})</TabsTrigger>
              <TabsTrigger value="todos">Todos ({filteredChamados.length})</TabsTrigger>
            </TabsList>

            {['abertos', 'andamento', 'resolvidos', 'todos'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <Card>
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
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
