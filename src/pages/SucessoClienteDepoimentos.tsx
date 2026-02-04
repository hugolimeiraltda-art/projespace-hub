import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThumbsUp, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

interface CustomerPortfolioRef {
  razao_social: string;
  contrato: string;
  filial?: string | null;
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

export default function SucessoClienteDepoimentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchDepoimentos();
  }, []);

  const fetchDepoimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_depoimentos')
        .select('*, customer_portfolio(razao_social, contrato, filial)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepoimentos(data || []);
    } catch (error) {
      console.error('Error fetching depoimentos:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar depoimentos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allFiliais = useMemo(() => {
    return [...new Set(depoimentos.map(d => d.customer_portfolio?.filial).filter((f): f is string => !!f))].sort();
  }, [depoimentos]);

  const filteredDepoimentos = useMemo(() => {
    return depoimentos.filter(d => {
      return filialFilter.length === 0 || (d.customer_portfolio?.filial && filialFilter.includes(d.customer_portfolio.filial));
    });
  }, [depoimentos, filialFilter]);

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
                <ThumbsUp className="w-6 h-6 text-green-500" />
                Depoimentos e Elogios
              </h1>
              <p className="text-muted-foreground">Feedbacks positivos e sugestões dos clientes</p>
            </div>
          </div>
          <Button onClick={() => navigate('/sucesso-cliente')}>
            <Plus className="w-4 h-4 mr-1" /> Novo Depoimento
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <FilialMultiSelect filiais={allFiliais} selectedFiliais={filialFilter} onSelectionChange={setFilialFilter} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{filteredDepoimentos.filter(d => d.tipo === 'elogio').length}</p>
            <p className="text-sm text-muted-foreground">Elogios</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{filteredDepoimentos.filter(d => d.tipo === 'sugestao').length}</p>
            <p className="text-sm text-muted-foreground">Sugestões</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{filteredDepoimentos.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="elogios">
            <TabsList>
              <TabsTrigger value="elogios">Elogios ({filteredDepoimentos.filter(d => d.tipo === 'elogio').length})</TabsTrigger>
              <TabsTrigger value="sugestoes">Sugestões ({filteredDepoimentos.filter(d => d.tipo === 'sugestao').length})</TabsTrigger>
              <TabsTrigger value="todos">Todos ({filteredDepoimentos.length})</TabsTrigger>
            </TabsList>

            {['elogios', 'sugestoes', 'todos'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDepoimentos
                    .filter(d => tab === 'todos' || 
                      (tab === 'elogios' && d.tipo === 'elogio') ||
                      (tab === 'sugestoes' && d.tipo === 'sugestao'))
                    .map((dep) => (
                    <Card key={dep.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/sucesso-cliente/${dep.customer_id}`)}>
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
                    <p className="text-center py-8 text-muted-foreground col-span-2">Nenhum depoimento encontrado</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
