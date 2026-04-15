import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ClipboardCheck, BarChart3, AlertTriangle, RefreshCw, Users, TrendingUp } from 'lucide-react';

const politicas = [
  {
    icon: ClipboardCheck,
    titulo: 'Política de Pesquisa de Satisfação',
    descricao: 'Diretrizes para aplicação e acompanhamento das pesquisas de satisfação com os clientes.',
    itens: [
      'Pesquisa aplicada após 30 dias da ativação do condomínio',
      'Periodicidade: a cada 6 meses para clientes ativos',
      'Canais de aplicação: telefone, e-mail ou presencial',
      'Resultados devem ser registrados no sistema em até 48h',
      'Pesquisas com nota abaixo de 7 devem gerar plano de ação imediato',
      'Responsável: Analista de Sucesso do Cliente designado à conta',
    ],
  },
  {
    icon: BarChart3,
    titulo: 'Política de NPS',
    descricao: 'Regras para coleta, análise e atuação sobre o Net Promoter Score.',
    itens: [
      'NPS coletado trimestralmente para toda a base ativa',
      'Classificação: Promotores (9-10), Neutros (7-8), Detratores (0-6)',
      'Detratores devem ser contatados em até 24h após a resposta',
      'Meta mínima de NPS da operação: 50 pontos',
      'Relatório consolidado apresentado mensalmente à diretoria',
      'Ações corretivas para contas detratoras com prazo máximo de 15 dias',
    ],
  },
  {
    icon: AlertTriangle,
    titulo: 'Política de Tratamento de Insatisfações e Reclamações',
    descricao: 'Fluxo de tratativa para clientes insatisfeitos ou com reclamações formais.',
    itens: [
      'Toda reclamação deve ser registrada como chamado no sistema',
      'Primeiro contato de retorno em até 4 horas úteis',
      'Escalonamento automático para supervisor se não resolvido em 48h',
      'Visita técnica presencial obrigatória para casos críticos',
      'Plano de ação documentado com responsável e prazo definidos',
      'Follow-up obrigatório após resolução: 7 e 30 dias',
      'Casos reincidentes (3+ reclamações) geram reunião de alinhamento com gestão',
    ],
  },
  {
    icon: RefreshCw,
    titulo: 'Política de Renovação Contratual',
    descricao: 'Procedimentos para gestão de renovações e retenção de contratos.',
    itens: [
      'Início do processo de renovação: 90 dias antes do vencimento',
      'Análise de saúde da conta (NPS, chamados, pendências) antes da abordagem',
      'Proposta de renovação enviada com no mínimo 60 dias de antecedência',
      'Negociações de reajuste seguem tabela aprovada pela diretoria',
      'Contas com risco de churn devem ter plano de retenção ativo',
      'Renovação concluída deve ser registrada com novo prazo no sistema',
      'Relatório mensal de contratos a vencer nos próximos 90 dias',
    ],
  },
  {
    icon: Users,
    titulo: 'Política de Reuniões de CS com Clientes por Ticket',
    descricao: 'Frequência e formato das reuniões periódicas com clientes conforme faixa de ticket.',
    itens: [
      'Ticket Premium (acima de R$ 5.000/mês): reunião mensal presencial ou online',
      'Ticket Alto (R$ 3.000 a R$ 5.000/mês): reunião bimestral',
      'Ticket Médio (R$ 1.500 a R$ 3.000/mês): reunião trimestral',
      'Ticket Básico (abaixo de R$ 1.500/mês): reunião semestral',
      'Pauta mínima: indicadores de operação, pendências, satisfação e melhorias',
      'Ata de reunião registrada no sistema em até 24h',
      'Itens de ação com responsável e prazo devem ser acompanhados no follow-up',
    ],
  },
];

export default function SucessoClientePoliticaCS() {
  return (
    <Layout>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Política de CS</h1>
            <p className="text-muted-foreground">Diretrizes e políticas do Sucesso do Cliente</p>
          </div>
        </div>

        <div className="grid gap-6">
          {politicas.map((politica) => {
            const Icon = politica.icon;
            return (
              <Card key={politica.titulo}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{politica.titulo}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{politica.descricao}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {politica.itens.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
