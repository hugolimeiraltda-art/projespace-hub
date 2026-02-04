import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, ArrowLeft, Loader2, ExternalLink, Plus } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

interface CustomerPortfolioRef {
  razao_social: string;
  contrato: string;
  filial?: string | null;
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

export default function SucessoClienteSatisfacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [satisfacaoData, setSatisfacaoData] = useState<Satisfacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState('12');

  useEffect(() => {
    fetchSatisfacao(parseInt(periodo));
  }, [periodo]);

  const fetchSatisfacao = async (meses: number) => {
    setLoading(true);
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
      toast({ title: 'Erro', description: 'Erro ao carregar pesquisas de satisfação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allFiliais = useMemo(() => {
    return [...new Set(satisfacaoData.map(s => s.customer_portfolio?.filial).filter((f): f is string => !!f))].sort();
  }, [satisfacaoData]);

  const filteredSatisfacao = useMemo(() => {
    return satisfacaoData.filter(s => {
      return filialFilter.length === 0 || (s.customer_portfolio?.filial && filialFilter.includes(s.customer_portfolio.filial));
    });
  }, [satisfacaoData, filialFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
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
                <TrendingUp className="w-6 h-6 text-blue-500" />
                Índice de Satisfação
              </h1>
              <p className="text-muted-foreground">Pesquisas completas de satisfação dos clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
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
            <Button onClick={() => navigate('/sucesso-cliente')}>
              <Plus className="w-4 h-4 mr-1" /> Nova Pesquisa
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <FilialMultiSelect filiais={allFiliais} selectedFiliais={filialFilter} onSelectionChange={setFilialFilter} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{filteredSatisfacao.length}</p>
            <p className="text-sm text-muted-foreground">Total Pesquisas</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{filteredSatisfacao.filter(s => s.expectativa_atendida === 'sim').length}</p>
            <p className="text-sm text-muted-foreground">Expectativa Atendida</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{filteredSatisfacao.filter(s => s.facilidade_app === 'muito_satisfeito' || s.facilidade_app === 'satisfeito').length}</p>
            <p className="text-sm text-muted-foreground">Satisfeitos com App</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{filteredSatisfacao.filter(s => s.treinamento_adequado === 'sim').length}</p>
            <p className="text-sm text-muted-foreground">Treinamento OK</p>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <Card>
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
                {filteredSatisfacao.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma pesquisa encontrada no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </Layout>
  );
}
