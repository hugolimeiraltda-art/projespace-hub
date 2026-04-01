import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Award, CheckCircle2, XCircle, Save } from 'lucide-react';
import { format } from 'date-fns';

const MODULOS = [
  {
    numero: 1,
    nome: 'Introdução',
    topicos: [
      'Conceito de Portaria Digital e benefícios',
      'Estrutura geral de um sistema de portaria inteligente',
      'Regras de segurança e boas práticas na instalação',
    ],
  },
  {
    numero: 2,
    nome: 'Infraestrutura Central',
    topicos: [
      'Rack e organização de equipamentos',
      'Fontes, Nobreaks e distribuição elétrica',
      'Switches, roteadores e modens (Mikrotik, TP-Link, etc.)',
      'Módulo Guarita (MG3000) e ATA (Khomp)',
    ],
  },
  {
    numero: 3,
    nome: 'Instalação de Portas de Pedestres',
    topicos: [
      'Estrutura e adequações (alumínio, vidro, batentes, molas)',
      'Instalação de leitores faciais (altura, suporte e alinhamento)',
      'Botoeiras (saída e emergência)',
      'Fechaduras eletromagnéticas e solenóides',
      'Sensores de redundância e testes funcionais',
    ],
  },
  {
    numero: 4,
    nome: 'Instalação de Portões de Garagem',
    topicos: [
      'Tipos de portões (deslizante, pivotante, basculante)',
      'Motores e estrutura mecânica',
      'Fechaduras magnéticas e sensores de porta',
      'Botoeiras de emergência',
      'Instalação elétrica (circuitos, disjuntores, relés, fotocélulas)',
      'Módulo Guarita e RTX-3004',
      'Antenas RTAG3000 e laço indutivo',
    ],
  },
  {
    numero: 5,
    nome: 'Sistemas de Alarme',
    topicos: [
      'Central de Alarme (configuração e instalação)',
      'Integração de sensores (zonas físicas e lógicas)',
      'Sensores IVA (instalação, alinhamento e regulagem)',
      'Regras de alimentação, cabos e resistores',
    ],
  },
  {
    numero: 6,
    nome: 'Integração em Elevadores',
    topicos: [
      'Rádio WOM 5A e comunicação sem fio',
      'Rádio Cabine e Rádio Fosso',
      'Instalação de câmeras em elevadores',
      'Fontes PoE e cuidados na fiação',
      'Regras gerais em parceria com empresas de elevadores',
    ],
  },
  {
    numero: 7,
    nome: 'Fibra Óptica e Rede FTTH',
    topicos: [
      'Conceito de FTTH e aplicação em portarias digitais',
      'Instalação de cabo drop óptico (ponto a ponto)',
      'Conversores de mídia, CTO e ONU',
      'Conectores APC e ferramentas de emenda/conectorização',
      'Cuidados com curvatura (macro e microcurvatura)',
      'Testes de potência e boas práticas de rede',
    ],
  },
  {
    numero: 8,
    nome: 'Testes, Ajustes e Entrega',
    topicos: [
      'Checklist de instalação por etapa (portas, portões, alarmes, rede)',
      'Testes de funcionamento (travas, leitores, câmeras, alarmes)',
      'Documentação da instalação',
      'Orientação para usuários finais (síndicos e condôminos)',
    ],
  },
];

interface Certificacao {
  id?: string;
  tecnico_id: string;
  modulo: number;
  nome_modulo: string;
  homologado: boolean;
  data_homologacao: string | null;
  observacoes: string | null;
}

const TecnicoCertificacoes = () => {
  const { tecnicoId } = useParams<{ tecnicoId: string }>();
  const navigate = useNavigate();
  const [tecnico, setTecnico] = useState<any>(null);
  const [certificacoes, setCertificacoes] = useState<Record<number, Certificacao>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tecnicoId) {
      fetchData();
    }
  }, [tecnicoId]);

  const fetchData = async () => {
    const [tecRes, certRes] = await Promise.all([
      supabase.from('manutencao_tecnicos').select('*').eq('id', tecnicoId!).single(),
      supabase.from('tecnico_certificacoes').select('*').eq('tecnico_id', tecnicoId!),
    ]);

    if (tecRes.data) setTecnico(tecRes.data);

    const map: Record<number, Certificacao> = {};
    MODULOS.forEach((m) => {
      const existing = certRes.data?.find((c: any) => c.modulo === m.numero);
      map[m.numero] = existing
        ? {
            id: existing.id,
            tecnico_id: tecnicoId!,
            modulo: existing.modulo,
            nome_modulo: existing.nome_modulo,
            homologado: existing.homologado,
            data_homologacao: existing.data_homologacao,
            observacoes: existing.observacoes,
          }
        : {
            tecnico_id: tecnicoId!,
            modulo: m.numero,
            nome_modulo: `Módulo ${m.numero} – ${m.nome}`,
            homologado: false,
            data_homologacao: null,
            observacoes: null,
          };
    });
    setCertificacoes(map);
    setLoading(false);
  };

  const updateCert = (modulo: number, field: string, value: any) => {
    setCertificacoes((prev) => ({
      ...prev,
      [modulo]: { ...prev[modulo], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const cert of Object.values(certificacoes)) {
        const payload = {
          tecnico_id: cert.tecnico_id,
          modulo: cert.modulo,
          nome_modulo: cert.nome_modulo,
          homologado: cert.homologado,
          data_homologacao: cert.data_homologacao || null,
          observacoes: cert.observacoes || null,
        };

        if (cert.id) {
          await supabase.from('tecnico_certificacoes').update(payload).eq('id', cert.id);
        } else {
          await supabase.from('tecnico_certificacoes').insert(payload);
        }
      }
      toast.success('Certificações salvas com sucesso!');
      fetchData();
    } catch {
      toast.error('Erro ao salvar certificações');
    }
    setSaving(false);
  };

  const totalHomologados = Object.values(certificacoes).filter((c) => c.homologado).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/manutencao/tecnicos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Certificações e Homologações
              </h1>
              <p className="text-muted-foreground">
                {tecnico?.nome || tecnico?.razao_social} — {tecnico?.empresa?.join(', ') || 'Sem empresa'} | {tecnico?.praca?.join(', ') || 'Sem praça'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={totalHomologados === 8 ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {totalHomologados}/8 módulos homologados
            </Badge>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all"
            style={{ width: `${(totalHomologados / 8) * 100}%` }}
          />
        </div>

        {/* Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MODULOS.map((modulo) => {
            const cert = certificacoes[modulo.numero];
            return (
              <Card key={modulo.numero} className={cert?.homologado ? 'border-primary/50 bg-primary/5' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {cert?.homologado ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      Módulo {modulo.numero} – {modulo.nome}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Homologado</span>
                      <Switch
                        checked={cert?.homologado || false}
                        onCheckedChange={(v) => {
                          updateCert(modulo.numero, 'homologado', v);
                          if (v && !cert?.data_homologacao) {
                            updateCert(modulo.numero, 'data_homologacao', new Date().toISOString().split('T')[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Conteúdo programático:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {modulo.topicos.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <label className="text-xs font-medium text-foreground">Data da Homologação</label>
                      <Input
                        type="date"
                        value={cert?.data_homologacao || ''}
                        onChange={(e) => updateCert(modulo.numero, 'data_homologacao', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Observações</label>
                      <Textarea
                        value={cert?.observacoes || ''}
                        onChange={(e) => updateCert(modulo.numero, 'observacoes', e.target.value)}
                        className="min-h-[32px] h-8 text-xs resize-none"
                        placeholder="Notas sobre a certificação..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default TecnicoCertificacoes;
