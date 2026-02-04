import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Calendar, AlertTriangle, ClipboardList, ArrowRight } from 'lucide-react';

export default function Manutencao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    agendasAtivas: 0,
    agendasProximas7Dias: 0,
    chamadosAbertos: 0,
    chamadosPreventivos: 0,
    chamadosCorretivos: 0,
    chamadosEletivos: 0,
    pendenciasAbertas: 0,
    pendenciasAtrasadas: 0,
    pendenciasCriticas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch agendas preventivas
      const { data: agendas } = await supabase
        .from('manutencao_agendas_preventivas')
        .select('id, proxima_execucao, ativo')
        .eq('ativo', true);

      const hoje = new Date();
      const em7Dias = new Date();
      em7Dias.setDate(em7Dias.getDate() + 7);

      const agendasProximas = (agendas || []).filter(a => {
        const proxima = new Date(a.proxima_execucao);
        return proxima >= hoje && proxima <= em7Dias;
      }).length;

      // Fetch chamados
      const { data: chamados } = await supabase
        .from('manutencao_chamados')
        .select('id, tipo, status');

      const chamadosAbertos = (chamados || []).filter(c => 
        c.status !== 'CONCLUIDO' && c.status !== 'CANCELADO'
      ).length;
      const chamadosPreventivos = (chamados || []).filter(c => c.tipo === 'PREVENTIVO').length;
      const chamadosCorretivos = (chamados || []).filter(c => c.tipo === 'CORRETIVO').length;
      const chamadosEletivos = (chamados || []).filter(c => c.tipo === 'ELETIVO').length;

      // Fetch pendências
      const { data: pendencias } = await supabase
        .from('manutencao_pendencias')
        .select('id, status, data_prazo');

      const pendenciasAbertas = (pendencias || []).filter(p => 
        p.status === 'ABERTO' || p.status === 'EM_ANDAMENTO'
      ).length;

      const pendenciasAtrasadas = (pendencias || []).filter(p => {
        if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
        return new Date(p.data_prazo) < hoje;
      }).length;

      const em24h = new Date();
      em24h.setDate(em24h.getDate() + 1);
      const pendenciasCriticas = (pendencias || []).filter(p => {
        if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return false;
        const prazo = new Date(p.data_prazo);
        return prazo <= em24h;
      }).length;

      setMetrics({
        agendasAtivas: (agendas || []).length,
        agendasProximas7Dias: agendasProximas,
        chamadosAbertos,
        chamadosPreventivos,
        chamadosCorretivos,
        chamadosEletivos,
        pendenciasAbertas,
        pendenciasAtrasadas,
        pendenciasCriticas,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Manutenção
          </h1>
          <p className="text-muted-foreground">
            Painel de indicadores e gestão de manutenção
          </p>
        </div>

        {/* Cards de Navegação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Agendas Preventivas */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
            onClick={() => navigate('/manutencao/preventivas')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Agendas Preventivas
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gerencie as agendas de manutenção preventiva dos clientes
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-2xl font-bold text-foreground">{metrics.agendasAtivas}</p>
                  <p className="text-xs text-muted-foreground">Agendas Ativas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{metrics.agendasProximas7Dias}</p>
                  <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Chamados */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
            onClick={() => navigate('/manutencao/chamados')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                  Chamados
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preventivas, eletivas e corretivas
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metrics.chamadosAbertos}</p>
                  <p className="text-xs text-muted-foreground">Em Aberto</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Preventivos:</span>
                    <span className="font-medium">{metrics.chamadosPreventivos}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Corretivos:</span>
                    <span className="font-medium">{metrics.chamadosCorretivos}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Eletivos:</span>
                    <span className="font-medium">{metrics.chamadosEletivos}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Controle de Pendências */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
            onClick={() => navigate('/manutencao/pendencias')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Controle de Pendências
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pendências de clientes e departamentos
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{metrics.pendenciasAbertas}</p>
                  <p className="text-xs text-muted-foreground">Abertas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{metrics.pendenciasAtrasadas}</p>
                  <p className="text-xs text-muted-foreground">Atrasadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.pendenciasCriticas}</p>
                  <p className="text-xs text-muted-foreground">Críticas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
