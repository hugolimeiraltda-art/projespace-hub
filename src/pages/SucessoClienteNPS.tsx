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
import { Star, ArrowLeft, Loader2, ExternalLink, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

interface CustomerPortfolioRef {
  razao_social: string;
  contrato: string;
  filial?: string | null;
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

export default function SucessoClienteNPS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [npsSurveys, setNpsSurveys] = useState<NpsSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchNpsSurveys();
  }, []);

  const fetchNpsSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_nps')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNpsSurveys(data || []);
    } catch (error) {
      console.error('Error fetching NPS:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar pesquisas NPS', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allFiliais = useMemo(() => {
    return [...new Set(npsSurveys.map(n => n.customer_portfolio?.filial).filter((f): f is string => !!f))].sort();
  }, [npsSurveys]);

  const filteredNps = useMemo(() => {
    return npsSurveys.filter(n => {
      return filialFilter.length === 0 || (n.customer_portfolio?.filial && filialFilter.includes(n.customer_portfolio.filial));
    });
  }, [npsSurveys, filialFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
  };

  const getNpsCategory = (nota: number) => {
    if (nota >= 9) return 'promoter';
    if (nota >= 7) return 'neutral';
    return 'detractor';
  };

  const npsScore = filteredNps.length > 0 
    ? Math.round(((filteredNps.filter(n => getNpsCategory(n.nota) === 'promoter').length - filteredNps.filter(n => getNpsCategory(n.nota) === 'detractor').length) / filteredNps.length) * 100)
    : null;

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
                <Star className="w-6 h-6 text-purple-500" />
                Pesquisas de NPS
              </h1>
              <p className="text-muted-foreground">Acompanhe a satisfação dos clientes através do NPS</p>
            </div>
          </div>
          <Button onClick={() => navigate('/sucesso-cliente')}>
            <Plus className="w-4 h-4 mr-1" /> Nova Pesquisa
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <FilialMultiSelect filiais={allFiliais} selectedFiliais={filialFilter} onSelectionChange={setFilialFilter} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{npsScore !== null ? npsScore : '--'}</p>
            <p className="text-sm text-muted-foreground">NPS Score</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{filteredNps.filter(n => getNpsCategory(n.nota) === 'promoter').length}</p>
            <p className="text-sm text-muted-foreground">Promotores (9-10)</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{filteredNps.filter(n => getNpsCategory(n.nota) === 'neutral').length}</p>
            <p className="text-sm text-muted-foreground">Neutros (7-8)</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{filteredNps.filter(n => getNpsCategory(n.nota) === 'detractor').length}</p>
            <p className="text-sm text-muted-foreground">Detratores (0-6)</p>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="detratores">
            <TabsList>
              <TabsTrigger value="detratores">Detratores</TabsTrigger>
              <TabsTrigger value="promotores">Promotores</TabsTrigger>
              <TabsTrigger value="todos">Todos ({filteredNps.length})</TabsTrigger>
            </TabsList>

            {['detratores', 'promotores', 'todos'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Ponto Forte</TableHead>
                        <TableHead>Ponto Fraco</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNps
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
                          <TableCell className="max-w-40 truncate">{nps.ponto_forte || '-'}</TableCell>
                          <TableCell className="max-w-40 truncate">{nps.ponto_fraco || '-'}</TableCell>
                          <TableCell className="max-w-40 truncate">{nps.comentario || '-'}</TableCell>
                          <TableCell>{formatDate(nps.created_at)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/sucesso-cliente/${nps.customer_id}`)}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredNps.filter(n => tab === 'todos' || 
                        (tab === 'detratores' && getNpsCategory(n.nota) === 'detractor') ||
                        (tab === 'promotores' && getNpsCategory(n.nota) === 'promoter')).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma pesquisa encontrada
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
