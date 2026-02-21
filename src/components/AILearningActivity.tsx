import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, RefreshCw, Calendar, TrendingUp, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataSourceActivity {
  name: string;
  label: string;
  lastUpdated: string | null;
  recentCount: number;
  totalCount: number;
}

export function AILearningActivity() {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['ai-learning-activity'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        // Last updated per source
        { data: lastProduto },
        { data: lastKit },
        { data: lastCliente },
        { data: lastProjeto },
        { data: lastRegra },
        { data: lastSessao },
        { data: lastMidia },
        // Recent additions (last 7 days)
        { count: recentProdutos },
        { count: recentKits },
        { count: recentClientes },
        { count: recentProjetos },
        { count: recentRegras },
        { count: recentSessoes },
        { count: recentMidias },
        // Totals
        { count: totalProdutos },
        { count: totalKits },
        { count: totalClientes },
        { count: totalProjetos },
        { count: totalRegras },
        { count: totalSessoes },
        { count: totalMidias },
      ] = await Promise.all([
        supabase.from('orcamento_produtos').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('orcamento_kits').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('customer_portfolio').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('projects').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('orcamento_regras_precificacao').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('orcamento_sessoes').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
        supabase.from('orcamento_midias').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
        // Recent counts
        supabase.from('orcamento_produtos').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('orcamento_kits').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('customer_portfolio').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('projects').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('orcamento_regras_precificacao').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('orcamento_sessoes').select('*', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo),
        supabase.from('orcamento_midias').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        // Totals
        supabase.from('orcamento_produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('orcamento_kits').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('customer_portfolio').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_regras_precificacao').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_sessoes').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_midias').select('*', { count: 'exact', head: true }),
      ]);

      const sources: DataSourceActivity[] = [
        { name: 'produtos', label: 'Catálogo de Produtos', lastUpdated: lastProduto?.updated_at || null, recentCount: recentProdutos || 0, totalCount: totalProdutos || 0 },
        { name: 'kits', label: 'Kits de Equipamentos', lastUpdated: lastKit?.updated_at || null, recentCount: recentKits || 0, totalCount: totalKits || 0 },
        { name: 'clientes', label: 'Carteira de Clientes', lastUpdated: lastCliente?.updated_at || null, recentCount: recentClientes || 0, totalCount: totalClientes || 0 },
        { name: 'projetos', label: 'Projetos e Formulários', lastUpdated: lastProjeto?.updated_at || null, recentCount: recentProjetos || 0, totalCount: totalProjetos || 0 },
        { name: 'regras', label: 'Regras de Precificação', lastUpdated: lastRegra?.updated_at || null, recentCount: recentRegras || 0, totalCount: totalRegras || 0 },
        { name: 'sessoes', label: 'Sessões de Orçamento', lastUpdated: lastSessao?.updated_at || null, recentCount: recentSessoes || 0, totalCount: totalSessoes || 0 },
        { name: 'midias', label: 'Fotos e Vídeos', lastUpdated: lastMidia?.created_at || null, recentCount: recentMidias || 0, totalCount: totalMidias || 0 },
      ];

      const totalRecent = sources.reduce((s, x) => s + x.recentCount, 0);
      const totalAll = sources.reduce((s, x) => s + x.totalCount, 0);

      return { sources, totalRecent, totalAll };
    },
    refetchInterval: 30000,
  });

  if (isLoading || !activity) return null;

  const formatTime = (date: string | null) => {
    if (!date) return 'Nunca';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Andamento do Aprendizado
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <Zap className="w-3 h-3" />
            {activity.totalRecent} atualizações nos últimos 7 dias
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          A IA aprende automaticamente com cada dado novo ou atualizado no sistema. Veja abaixo o que mudou recentemente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.sources.map((source) => {
          const hasRecent = source.recentCount > 0;
          return (
            <div key={source.name} className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasRecent ? (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                  <span className="text-sm font-medium text-foreground">{source.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasRecent && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{source.recentCount} esta semana
                    </Badge>
                  )}
                  <span className="text-sm font-semibold text-foreground">{source.totalCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Última atualização: {formatTime(source.lastUpdated)}</span>
              </div>
              {hasRecent && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-green-500 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Aprendendo com {source.recentCount} {source.recentCount === 1 ? 'registro novo' : 'registros novos'}...
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Cobertura total de dados</span>
            <span className="font-semibold text-foreground">{activity.totalAll} registros</span>
          </div>
          <Progress value={Math.min(100, (activity.totalAll / 700) * 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            A IA consulta todos os dados em tempo real a cada interação. Quanto mais dados, mais precisa a resposta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
