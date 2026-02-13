import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Building,
  Gauge,
  Phone,
  DoorOpen,
  Camera,
  Shield,
  Lock,
  Info,
  MapPin,
  Users,
  Wifi,
  Zap,
  Eye,
  MonitorSpeaker,
  Printer,
} from 'lucide-react';
import {
  ALARME_TIPO_LABELS,
  METODO_ACIONAMENTO_LABELS,
  AlarmeTipo,
  MetodoAcionamentoPortoes,
} from '@/types/project';

interface SaleFormData {
  nome_condominio: string | null;
  filial: string | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
  qtd_apartamentos: number | null;
  qtd_blocos: number | null;
  produto: string | null;
  acesso_local_central_portaria: string | null;
  cabo_metros_qdg_ate_central: number | null;
  internet_exclusiva: string | null;
  obs_central_portaria_qdg: string | null;
  transbordo_para_apartamentos: string | null;
  local_central_interfonia_descricao: string | null;
  qtd_portas_pedestre: number | null;
  qtd_portas_bloco: number | null;
  qtd_saida_autenticada: number | null;
  obs_portas: string | null;
  qtd_portoes_deslizantes: number | null;
  qtd_portoes_pivotantes: number | null;
  qtd_portoes_basculantes: number | null;
  metodo_acionamento_portoes: string | null;
  qtd_dvrs_aproveitados: number | null;
  marca_modelo_dvr_aproveitado: string | null;
  qtd_cameras_aproveitadas: number | null;
  cftv_novo_qtd_dvr_4ch: number | null;
  cftv_novo_qtd_dvr_8ch: number | null;
  cftv_novo_qtd_dvr_16ch: number | null;
  cftv_novo_qtd_total_cameras: number | null;
  qtd_cameras_elevador: number | null;
  acessos_tem_camera_int_ext: boolean | null;
  alarme_tipo: string | null;
  iva_central_alarme_tipo: string | null;
  iva_qtd_pares_existentes: number | null;
  iva_qtd_novos: number | null;
  iva_qtd_cabo_blindado: string | null;
  cerca_central_alarme_tipo: string | null;
  cerca_qtd_cabo_centenax: number | null;
  cerca_local_central_choque: string | null;
  cerca_metragem_linear_total: number | null;
  cerca_qtd_fios: number | null;
  possui_cancela: boolean | null;
  possui_catraca: boolean | null;
  possui_totem: boolean | null;
  cancela_qtd_sentido_unico: number | null;
  cancela_qtd_duplo_sentido: number | null;
  cancela_aproveitada_detalhes: string | null;
  cancela_autenticacao: string | null;
  catraca_qtd_sentido_unico: number | null;
  catraca_qtd_duplo_sentido: number | null;
  catraca_aproveitada_detalhes: string | null;
  catraca_autenticacao: string | null;
  totem_qtd_simples: number | null;
  totem_qtd_duplo: number | null;
  obs_gerais: string | null;
}

interface ProjectInfo {
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  vendedor_nome: string;
  created_at: string;
  status: string;
}

function DataItem({ label, value, icon }: { label: string; value: string | number | null | undefined; icon?: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <span className="mt-0.5 text-primary">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground">{String(value)}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  const hasContent = (() => {
    // Check if children has any non-null rendered content
    if (!children) return false;
    if (Array.isArray(children)) return children.some(c => c !== null && c !== undefined);
    return true;
  })();

  if (!hasContent) return null;

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="bg-primary/5 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <CardContent className="pt-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  if (!value) return null;
  return (
    <div className="text-center p-4 rounded-xl bg-primary/5 border">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
    </div>
  );
}

export default function SaleFormView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<SaleFormData | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [{ data: projectData }, { data: formData }] = await Promise.all([
          supabase.from('projects').select('numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, status').eq('id', id).single(),
          supabase.from('sale_forms').select('*').eq('project_id', id).maybeSingle(),
        ]);

        if (projectData) setProject(projectData);
        if (formData) setForm(formData as unknown as SaleFormData);
      } catch (err) {
        console.error(err);
        toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando formulário...</p>
        </div>
      </Layout>
    );
  }

  if (!project || !form) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Formulário de venda não encontrado para este projeto.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </Layout>
    );
  }

  const internetLabel = form.internet_exclusiva === 'SIM' ? 'Sim' : form.internet_exclusiva === 'NAO' ? 'Não' : form.internet_exclusiva === 'A_CONTRATAR' ? 'A Contratar' : form.internet_exclusiva;
  const alarmeLabel = form.alarme_tipo ? ALARME_TIPO_LABELS[form.alarme_tipo as AlarmeTipo] || form.alarme_tipo : null;
  const acionamentoLabel = form.metodo_acionamento_portoes ? METODO_ACIONAMENTO_LABELS[form.metodo_acionamento_portoes as MetodoAcionamentoPortoes] || form.metodo_acionamento_portoes : null;

  const totalPortoes = (form.qtd_portoes_deslizantes || 0) + (form.qtd_portoes_pivotantes || 0) + (form.qtd_portoes_basculantes || 0);
  const totalPortas = (form.qtd_portas_pedestre || 0) + (form.qtd_portas_bloco || 0) + (form.qtd_saida_autenticada || 0);
  const totalCamerasNovas = form.cftv_novo_qtd_total_cameras || 0;
  const totalCamerasAproveitadas = form.qtd_cameras_aproveitadas || 0;
  const totalCancelas = (form.cancela_qtd_sentido_unico || 0) + (form.cancela_qtd_duplo_sentido || 0);
  const totalCatracas = (form.catraca_qtd_sentido_unico || 0) + (form.catraca_qtd_duplo_sentido || 0);
  const totalTotens = (form.totem_qtd_simples || 0) + (form.totem_qtd_duplo || 0);

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Hero Header */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
          <div className="relative p-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Projeto #{project.numero_projeto}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {form.produto || 'Portaria Digital'}
              </Badge>
              {form.filial && (
                <Badge variant="outline" className="text-xs">
                  Filial {form.filial}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {form.nome_condominio || project.cliente_condominio_nome}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {(project.cliente_cidade || project.cliente_estado) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[project.cliente_cidade, project.cliente_estado].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Vendedor: {form.vendedor_nome || project.vendedor_nome}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard label="Apartamentos" value={form.qtd_apartamentos} unit="unidades" />
              <StatCard label="Blocos" value={form.qtd_blocos} unit="torres" />
              <StatCard label="Câmeras" value={totalCamerasNovas + totalCamerasAproveitadas || null} unit="total" />
              <StatCard label="Acessos" value={totalPortas + totalPortoes || null} unit="portas + portões" />
            </div>
          </div>
        </div>

        {/* Context Banner */}
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-accent/50 border border-accent-foreground/10">
          <Info className="w-5 h-5 text-accent-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Sobre este formulário</p>
            <p className="text-xs text-muted-foreground mt-1">
              Este documento reúne todas as informações técnicas levantadas pelo vendedor durante a visita ao condomínio. 
              Os dados aqui descritos orientam a equipe de engenharia na elaboração do projeto e a equipe de implantação na execução, 
              garantindo que todos os equipamentos, infraestrutura e configurações estejam alinhados com a realidade do local.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* Infraestrutura */}
          <SectionCard
            title="Infraestrutura & Central de Portaria"
            description="Informações sobre o local onde será instalada a central de portaria digital, cabeamento e conectividade."
            icon={<Gauge className="w-5 h-5" />}
          >
            <DataItem label="Acesso ao local da central" value={form.acesso_local_central_portaria} />
            <DataItem label="Metragem cabo QDG → Central" value={form.cabo_metros_qdg_ate_central ? `${form.cabo_metros_qdg_ate_central} metros` : null} />
            <DataItem icon={<Wifi className="w-4 h-4" />} label="Internet exclusiva" value={internetLabel} />
            {form.obs_central_portaria_qdg && (
              <div className="md:col-span-2 mt-2 p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações sobre Central/QDG</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{form.obs_central_portaria_qdg}</p>
              </div>
            )}
          </SectionCard>

          {/* Telefonia */}
          <SectionCard
            title="Telefonia & Interfonia"
            description="Configuração do sistema de comunicação entre portaria e unidades."
            icon={<Phone className="w-5 h-5" />}
          >
            <DataItem label="Transbordo para apartamentos" value={form.transbordo_para_apartamentos} />
            <DataItem label="Local da central de interfonia" value={form.local_central_interfonia_descricao} />
          </SectionCard>

          {/* Portas */}
          <SectionCard
            title="Portas de Acesso"
            description="Quantitativo de portas controladas eletronicamente para pedestres e acessos aos blocos."
            icon={<DoorOpen className="w-5 h-5" />}
          >
            <DataItem label="Portas pedestre" value={form.qtd_portas_pedestre} />
            <DataItem label="Portas bloco" value={form.qtd_portas_bloco} />
            <DataItem label="Saídas autenticadas" value={form.qtd_saida_autenticada} />
            {form.obs_portas && (
              <div className="md:col-span-2 mt-2 p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{form.obs_portas}</p>
              </div>
            )}
          </SectionCard>

          {/* Portões */}
          <SectionCard
            title="Portões"
            description="Automação dos portões do condomínio, incluindo tipo de acionamento e mecanismo."
            icon={<DoorOpen className="w-5 h-5" />}
          >
            <DataItem label="Portões deslizantes" value={form.qtd_portoes_deslizantes} />
            <DataItem label="Portões pivotantes" value={form.qtd_portoes_pivotantes} />
            <DataItem label="Portões basculantes" value={form.qtd_portoes_basculantes} />
            <DataItem label="Método de acionamento" value={acionamentoLabel} />
          </SectionCard>

          {/* CFTV */}
          <SectionCard
            title="CFTV — Circuito Fechado de TV"
            description="Detalhamento do sistema de videomonitoramento, incluindo câmeras e DVRs aproveitados e novos a serem instalados."
            icon={<Camera className="w-5 h-5" />}
          >
            {/* Aproveitado */}
            {(form.qtd_dvrs_aproveitados || form.qtd_cameras_aproveitadas) && (
              <div className="md:col-span-2 mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Equipamentos Aproveitados</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <DataItem icon={<MonitorSpeaker className="w-4 h-4" />} label="DVRs aproveitados" value={form.qtd_dvrs_aproveitados} />
                  <DataItem label="Marca/Modelo DVR" value={form.marca_modelo_dvr_aproveitado} />
                  <DataItem icon={<Eye className="w-4 h-4" />} label="Câmeras aproveitadas" value={form.qtd_cameras_aproveitadas} />
                </div>
              </div>
            )}
            {/* Novo */}
            {(form.cftv_novo_qtd_dvr_4ch || form.cftv_novo_qtd_dvr_8ch || form.cftv_novo_qtd_dvr_16ch || totalCamerasNovas) && (
              <div className="md:col-span-2">
                <Separator className="my-2" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-3">Equipamentos Novos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <DataItem label="DVR 4 canais (novo)" value={form.cftv_novo_qtd_dvr_4ch} />
                  <DataItem label="DVR 8 canais (novo)" value={form.cftv_novo_qtd_dvr_8ch} />
                  <DataItem label="DVR 16 canais (novo)" value={form.cftv_novo_qtd_dvr_16ch} />
                  <DataItem icon={<Eye className="w-4 h-4" />} label="Total câmeras novas" value={totalCamerasNovas || null} />
                  <DataItem label="Câmeras de elevador" value={form.qtd_cameras_elevador} />
                  <DataItem label="Câmera int/ext nos acessos" value={form.acessos_tem_camera_int_ext ? 'Sim' : form.acessos_tem_camera_int_ext === false ? 'Não' : null} />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Alarme */}
          {alarmeLabel && alarmeLabel !== 'Nenhum' && (
            <SectionCard
              title="Sistema de Alarme"
              description={
                form.alarme_tipo === 'IVA'
                  ? 'Sistema de Infravermelho Ativo (IVA) para detecção perimetral por feixes de luz infravermelha.'
                  : 'Sistema de Cerca Elétrica para proteção perimetral com pulsos de alta voltagem.'
              }
              icon={<Shield className="w-5 h-5" />}
            >
              <DataItem icon={<Zap className="w-4 h-4" />} label="Tipo de alarme" value={alarmeLabel} />
              {form.alarme_tipo === 'IVA' && (
                <>
                  <DataItem label="Central alarme" value={form.iva_central_alarme_tipo === 'NOVA' ? 'Nova' : form.iva_central_alarme_tipo === 'APROVEITADA' ? 'Aproveitada' : form.iva_central_alarme_tipo} />
                  <DataItem label="Pares existentes" value={form.iva_qtd_pares_existentes} />
                  <DataItem label="IVAs novos" value={form.iva_qtd_novos} />
                  <DataItem label="Cabo blindado" value={form.iva_qtd_cabo_blindado} />
                </>
              )}
              {form.alarme_tipo === 'CERCA_ELETRICA' && (
                <>
                  <DataItem label="Central alarme" value={form.cerca_central_alarme_tipo === 'NOVA' ? 'Nova' : form.cerca_central_alarme_tipo === 'APROVEITADA' ? 'Aproveitada' : form.cerca_central_alarme_tipo} />
                  <DataItem label="Cabo Centenax" value={form.cerca_qtd_cabo_centenax} />
                  <DataItem label="Local central de choque" value={form.cerca_local_central_choque} />
                  <DataItem label="Metragem linear total" value={form.cerca_metragem_linear_total ? `${form.cerca_metragem_linear_total} metros` : null} />
                  <DataItem label="Quantidade de fios" value={form.cerca_qtd_fios} />
                </>
              )}
            </SectionCard>
          )}

          {/* Controle de Acesso */}
          {(form.possui_cancela || form.possui_catraca || form.possui_totem) && (
            <SectionCard
              title="Controle de Acesso — Equipamentos"
              description="Equipamentos de controle de entrada e saída de veículos e pedestres: cancelas, catracas e totens de reconhecimento."
              icon={<Lock className="w-5 h-5" />}
            >
              {form.possui_cancela && (
                <div className="md:col-span-2 mb-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Cancelas</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DataItem label="Sentido único" value={form.cancela_qtd_sentido_unico} />
                    <DataItem label="Duplo sentido" value={form.cancela_qtd_duplo_sentido} />
                    <DataItem label="Detalhes aproveitamento" value={form.cancela_aproveitada_detalhes} />
                    <DataItem label="Autenticação" value={form.cancela_autenticacao} />
                  </div>
                </div>
              )}
              {form.possui_catraca && (
                <div className="md:col-span-2 mb-3">
                  <Separator className="my-2" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-3">Catracas</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DataItem label="Sentido único" value={form.catraca_qtd_sentido_unico} />
                    <DataItem label="Duplo sentido" value={form.catraca_qtd_duplo_sentido} />
                    <DataItem label="Detalhes aproveitamento" value={form.catraca_aproveitada_detalhes} />
                    <DataItem label="Autenticação" value={form.catraca_autenticacao} />
                  </div>
                </div>
              )}
              {form.possui_totem && (
                <div className="md:col-span-2">
                  <Separator className="my-2" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-3">Totens</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DataItem label="Totem simples" value={form.totem_qtd_simples} />
                    <DataItem label="Totem duplo" value={form.totem_qtd_duplo} />
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Observações Gerais */}
          {form.obs_gerais && (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Observações Gerais</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {form.obs_gerais}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer context */}
          <div className="text-center py-6 text-xs text-muted-foreground">
            <p>Formulário de Venda Concluída — {form.nome_condominio || project.cliente_condominio_nome}</p>
            <p className="mt-1">Projeto #{project.numero_projeto} • Gerado pelo sistema EMIVE</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
