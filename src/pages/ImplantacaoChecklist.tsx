import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  ClipboardCheck,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  observacao?: string;
}

interface ChecklistData {
  items: ChecklistItem[];
}

const CHECKLIST_CONFIGS: Record<string, { title: string; items: string[] }> = {
  check_projeto: {
    title: 'Check de Projeto',
    items: [
      'Planta baixa conferida',
      'Posicionamento de câmeras definido',
      'Pontos de rede identificados',
      'Infraestrutura elétrica verificada',
      'Locais de instalação de equipamentos definidos',
      'Acesso ao QDG verificado',
      'Pontos de controle de acesso mapeados',
      'Portões e cancelas identificados',
    ],
  },
  laudo_visita_startup: {
    title: 'Laudo e Check-list de Visita de Start-up',
    items: [
      'Infraestrutura existente avaliada',
      'Condições do local verificadas',
      'Acesso para equipe técnica confirmado',
      'Materiais necessários listados',
      'Cronograma de execução definido',
      'Responsáveis identificados',
      'Fotos do local registradas',
      'Observações técnicas anotadas',
    ],
  },
  laudo_instalador: {
    title: 'Laudo e Check-list do Instalador',
    items: [
      'Cabeamento estruturado instalado',
      'Câmeras instaladas e posicionadas',
      'DVR/NVR instalado e configurado',
      'Pontos de rede testados',
      'Infraestrutura elétrica adequada',
      'Equipamentos de controle de acesso instalados',
      'Testes de funcionamento realizados',
      'Documentação técnica preenchida',
    ],
  },
  laudo_vidraceiro: {
    title: 'Laudo e Check-list do Vidraceiro',
    items: [
      'Medidas conferidas',
      'Vidros instalados corretamente',
      'Acabamentos finalizados',
      'Vedação adequada',
      'Limpeza realizada',
      'Funcionamento de portas/janelas testado',
      'Ferragens instaladas',
      'Qualidade do material verificada',
    ],
  },
  laudo_serralheiro: {
    title: 'Laudo e Check-list do Serralheiro',
    items: [
      'Estruturas metálicas instaladas',
      'Portões instalados e alinhados',
      'Cancelas instaladas',
      'Soldas e acabamentos conferidos',
      'Pintura/tratamento anticorrosivo aplicado',
      'Funcionamento mecânico testado',
      'Travas e fechaduras instaladas',
      'Automação compatível verificada',
    ],
  },
  laudo_conclusao: {
    title: 'Laudo e Check-list de Conclusão do Supervisor',
    items: [
      'Todos os equipamentos instalados',
      'Sistema de CFTV operacional',
      'Controle de acesso funcionando',
      'Interfonia operacional',
      'Alarme configurado e testado',
      'Integração com portaria virtual verificada',
      'Treinamento básico realizado',
      'Documentação entregue',
      'Limpeza do local realizada',
      'Aceite do cliente obtido',
    ],
  },
  check_programacao: {
    title: 'Check e Laudo de Programação',
    items: [
      'Sistema configurado no servidor',
      'Usuários cadastrados',
      'Permissões configuradas',
      'Câmeras integradas ao sistema',
      'Controle de acesso programado',
      'Tags/cartões cadastrados',
      'Alarme integrado',
      'Aplicativo configurado',
      'Testes de funcionamento realizados',
      'Backup configurado',
    ],
  },
};

export default function ImplantacaoChecklist() {
  const { id, tipo } = useParams<{ id: string; tipo: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [projectName, setProjectName] = useState('');

  const config = tipo ? CHECKLIST_CONFIGS[tipo] : null;

  useEffect(() => {
    if (id && tipo && config) {
      fetchData();
    }
  }, [id, tipo]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch project name
      const { data: projectData } = await supabase
        .from('projects')
        .select('cliente_condominio_nome')
        .eq('id', id)
        .single();

      if (projectData) {
        setProjectName(projectData.cliente_condominio_nome);
      }

      // Fetch existing checklist
      const { data: checklistData, error } = await supabase
        .from('implantacao_checklists')
        .select('*')
        .eq('project_id', id)
        .eq('tipo', tipo)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (checklistData) {
        const dados = checklistData.dados as unknown as ChecklistData;
        setChecklistItems(dados?.items || []);
        setObservacoesGerais(checklistData.observacoes || '');
      } else {
        // Initialize with default items
        const defaultItems: ChecklistItem[] = config!.items.map((label, index) => ({
          id: `item-${index}`,
          label,
          checked: false,
          observacao: '',
        }));
        setChecklistItems(defaultItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o checklist.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const updateItemObservacao = (itemId: string, observacao: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, observacao } : item
      )
    );
  };

  const handleSave = async () => {
    if (!id || !tipo) return;

    try {
      setIsSaving(true);

      const checklistData = {
        items: checklistItems,
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('implantacao_checklists')
        .select('id')
        .eq('project_id', id)
        .eq('tipo', tipo)
        .single();

      let error;
      if (existing) {
        const result = await supabase
          .from('implantacao_checklists')
          .update({
            dados: checklistData as unknown as Record<string, unknown>,
            observacoes: observacoesGerais,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', id)
          .eq('tipo', tipo);
        error = result.error;
      } else {
        const result = await supabase
          .from('implantacao_checklists')
          .insert({
            project_id: id,
            tipo: tipo,
            dados: checklistData as unknown as Record<string, unknown>,
            observacoes: observacoesGerais,
            created_by: user?.id,
            created_by_name: user?.nome,
          });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Salvo',
        description: 'Checklist salvo com sucesso.',
      });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o checklist.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completedCount = checklistItems.filter(item => item.checked).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!config) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Tipo de checklist inválido.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando checklist...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/startup-projetos/${id}/execucao`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
          </div>
          <p className="text-muted-foreground">{projectName}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} itens
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Itens do Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={item.id}
                      className={cn(
                        "cursor-pointer",
                        item.checked && "text-muted-foreground line-through"
                      )}
                    >
                      {item.label}
                    </Label>
                    <Input
                      placeholder="Observação (opcional)"
                      value={item.observacao || ''}
                      onChange={(e) => updateItemObservacao(item.id, e.target.value)}
                      className="mt-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* General Observations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Registre observações gerais sobre este checklist..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Checklist'}
        </Button>
      </div>
    </Layout>
  );
}
