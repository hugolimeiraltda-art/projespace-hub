import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Building,
  Settings2,
  Map,
  Camera,
  FileText,
  AlertTriangle,
  Check,
  Upload,
  Save,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import {
  TapForm,
  SolicitacaoOrigem,
  PortariaVirtualApp,
  ModalidadePortaria,
  CFTVElevador,
  CroquiItem,
  AttachmentType,
  PORTARIA_VIRTUAL_LABELS,
  MODALIDADE_PORTARIA_LABELS,
  CFTV_ELEVADOR_LABELS,
  CROQUI_ITEM_LABELS,
} from '@/types/project';
import { cn } from '@/lib/utils';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function NewProject() {
  const { user } = useAuth();
  const { addProject, addAttachment } = useProjects();
  const { uploadFile, isUploading, uploadProgress } = useFileUpload();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Project
  const [condominioNome, setCondominioNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [prazoUrgente, setPrazoUrgente] = useState(false);
  const [prazoUrgenteJustificativa, setPrazoUrgenteJustificativa] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Form state - TAP
  const [modalidadePortaria, setModalidadePortaria] = useState<ModalidadePortaria>('VIRTUAL');
  const [numeroBlocos, setNumeroBlocos] = useState(1);
  const [numeroUnidades, setNumeroUnidades] = useState<number | ''>('');
  const [interfoniaDescricao, setInterfoniaDescricao] = useState('');
  const [controlePedestre, setControlePedestre] = useState('');
  const [controleVeiculo, setControleVeiculo] = useState('');
  const [alarme, setAlarme] = useState('');
  const [cftvDvr, setCftvDvr] = useState('');
  const [cftvElevador, setCftvElevador] = useState<CFTVElevador>('NAO_INFORMADO');
  const [marcacaoCroquiItens, setMarcacaoCroquiItens] = useState<CroquiItem[]>([]);
  const [infoAdicionais, setInfoAdicionais] = useState('');

  // Attachments
  const [croquiFile, setCroquiFile] = useState<{ nome: string; file: File } | null>(null);
  const [fotos, setFotos] = useState<{ nome: string; file: File }[]>([]);
  const [observacoesFotos, setObservacoesFotos] = useState('');

  const hasCroquiAttachment = !!croquiFile;

  const canProceed = 
    condominioNome.trim() &&
    cidade.trim() &&
    estado &&
    hasCroquiAttachment;

  const handleCroquiItemToggle = (item: CroquiItem) => {
    setMarcacaoCroquiItens(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleAddFotos = (files: FileList) => {
    const newFotos = Array.from(files).map(file => ({ nome: file.name, file }));
    setFotos(prev => [...prev, ...newFotos]);
    toast({
      title: 'Fotos adicionadas',
      description: `${newFotos.length} foto(s) adicionada(s) com sucesso.`,
    });
  };

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const generateEmail = () => {
    const modalidadeLabel = MODALIDADE_PORTARIA_LABELS[modalidadePortaria];
    const cftvElevadorLabel = CFTV_ELEVADOR_LABELS[cftvElevador];

    return `Modalidade de Portaria: ${modalidadeLabel}
Número de blocos: ${numeroBlocos}
Número de unidades: ${numeroUnidades || 'Não informado'}

Interfonia: ${interfoniaDescricao || 'Não informado'}

Controle de acessos
    Pedestre - ${controlePedestre || 'Não informado'}
    Veículo - ${controleVeiculo || 'Não informado'}
    
Alarme - ${alarme || 'Não informado'}
CFTV - ${cftvDvr || 'Não informado'}
CFTV Elevador - ${cftvElevadorLabel}

Documentos anexo:
- Croqui: ${hasCroquiAttachment ? 'Sim' : 'Não'}
- Fotos: ${fotos.length > 0 ? `${fotos.length} foto(s)` : 'Não'}

Observações das fotos:
${observacoesFotos || 'Não informado'}

Informações adicionais
${infoAdicionais || 'Não informado'}

Observações gerais
${observacoesGerais || 'Não informado'}`;
  };

  const handleSave = async (goToReview: boolean) => {
    if (!user) return;

    if (goToReview && !canProceed) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha os campos obrigatórios e anexe o croqui para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const projectId = await addProject(
        {
          created_by_user_id: user.id,
          vendedor_nome: user.nome,
          vendedor_email: user.email,
          cliente_condominio_nome: condominioNome,
          cliente_cidade: cidade,
          cliente_estado: estado,
          endereco_condominio: endereco,
          status: 'RASCUNHO',
          prazo_entrega_projeto: prazoEntrega || undefined,
          observacoes_gerais: observacoesGerais || undefined,
          email_padrao_gerado: generateEmail(),
          numero_unidades: numeroUnidades || undefined,
        },
        {
          solicitacao_origem: 'EMAIL' as SolicitacaoOrigem,
          modalidade_portaria: modalidadePortaria,
          portaria_virtual_atendimento_app: 'NAO' as PortariaVirtualApp,
          numero_blocos: numeroBlocos,
          numero_unidades: numeroUnidades || undefined,
          interfonia: !!interfoniaDescricao,
          interfonia_descricao: interfoniaDescricao || undefined,
          controle_acessos_pedestre_descricao: controlePedestre || undefined,
          controle_acessos_veiculo_descricao: controleVeiculo || undefined,
          alarme_descricao: alarme || undefined,
          cftv_dvr_descricao: cftvDvr || undefined,
          cftv_elevador_possui: cftvElevador,
          observacao_nao_assumir_cameras: true,
          marcacao_croqui_confirmada: true,
          marcacao_croqui_itens: marcacaoCroquiItens,
          info_adicionais: `${infoAdicionais || ''}${observacoesFotos ? `\n\nObservações das fotos:\n${observacoesFotos}` : ''}`,
        }
      );

      if (!projectId) {
        throw new Error('Failed to create project');
      }

      // Upload croqui
      if (croquiFile) {
        const uploadResult = await uploadFile(croquiFile.file, projectId, 'croqui');
        if (uploadResult) {
          await addAttachment(projectId, {
            tipo: 'CROQUI',
            arquivo_url: uploadResult.url,
            nome_arquivo: croquiFile.nome,
          });
        }
      }

      // Upload fotos
      for (const foto of fotos) {
        const uploadResult = await uploadFile(foto.file, projectId, 'fotos');
        if (uploadResult) {
          await addAttachment(projectId, {
            tipo: 'IMAGENS',
            arquivo_url: uploadResult.url,
            nome_arquivo: foto.nome,
          });
        }
      }

      toast({
        title: goToReview ? 'Projeto salvo!' : 'Rascunho salvo!',
        description: goToReview 
          ? 'Revise os dados antes de enviar para a equipe de Projetos.'
          : 'Você pode continuar editando depois.',
      });

      if (goToReview) {
        navigate(`/projetos/${projectId}/editar`);
      } else {
        navigate(`/projetos/${projectId}`);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o projeto.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Novo Projeto (TAP)</h1>
          <p className="text-muted-foreground mt-1">Termo de Abertura de Projeto</p>
        </div>

        <div className="space-y-6">
          {/* Seção 1: Identificação */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="w-5 h-5 text-primary" />
                Identificação do Condomínio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condominio">Nome do Condomínio *</Label>
                  <Input
                    id="condominio"
                    value={condominioNome}
                    onChange={(e) => setCondominioNome(e.target.value)}
                    placeholder="Ex: Residencial Sol Nascente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número - Bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo de Entrega do Projeto</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="prazo"
                      type="date"
                      value={prazoEntrega}
                      onChange={(e) => setPrazoEntrega(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="prazoUrgente"
                        checked={prazoUrgente}
                        onCheckedChange={(checked) => {
                          setPrazoUrgente(!!checked);
                          if (!checked) setPrazoUrgenteJustificativa('');
                        }}
                      />
                      <Label htmlFor="prazoUrgente" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                        Urgente
                      </Label>
                    </div>
                  </div>
                  {prazoUrgente && (
                    <Textarea
                      value={prazoUrgenteJustificativa}
                      onChange={(e) => setPrazoUrgenteJustificativa(e.target.value)}
                      placeholder="Justifique o motivo da urgência..."
                      rows={2}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 2: Configuração */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5 text-primary" />
                Configuração da Solução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Modalidade de Portaria</Label>
                  <Select value={modalidadePortaria} onValueChange={(v) => setModalidadePortaria(v as ModalidadePortaria)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODALIDADE_PORTARIA_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blocos">Número de Blocos</Label>
                  <Input
                    id="blocos"
                    type="number"
                    min={1}
                    value={numeroBlocos}
                    onChange={(e) => setNumeroBlocos(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidades">Número de Unidades</Label>
                  <Input
                    id="unidades"
                    type="number"
                    min={1}
                    value={numeroUnidades}
                    onChange={(e) => setNumeroUnidades(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Ex: 100"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-foreground text-sm">Interfonia</h3>
                <div className="space-y-2">
                  <Textarea
                    id="interfonia"
                    value={interfoniaDescricao}
                    onChange={(e) => setInterfoniaDescricao(e.target.value)}
                    placeholder="Descreva o sistema de interfonia do condomínio..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-foreground text-sm">Controle de Acessos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pedestre">Pedestre</Label>
                    <Textarea
                      id="pedestre"
                      value={controlePedestre}
                      onChange={(e) => setControlePedestre(e.target.value)}
                      placeholder="Descreva o controle de acesso de pedestres..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="veiculo">Veículo</Label>
                    <Textarea
                      id="veiculo"
                      value={controleVeiculo}
                      onChange={(e) => setControleVeiculo(e.target.value)}
                      placeholder="Descreva o controle de acesso de veículos..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-foreground text-sm">Segurança</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alarme">Alarme</Label>
                    <Textarea
                      id="alarme"
                      value={alarme}
                      onChange={(e) => setAlarme(e.target.value)}
                      placeholder="Descreva o sistema de alarme..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cftv">CFTV / DVR</Label>
                    <Textarea
                      id="cftv"
                      value={cftvDvr}
                      onChange={(e) => setCftvDvr(e.target.value)}
                      placeholder="Descreva o sistema de CFTV..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CFTV Elevador</Label>
                  <Select value={cftvElevador} onValueChange={(v) => setCftvElevador(v as CFTVElevador)}>
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CFTV_ELEVADOR_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Anexos */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="w-5 h-5 text-primary" />
                Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Croqui - Obrigatório */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Croqui das Câmeras Novas *</Label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                    hasCroquiAttachment 
                      ? "border-success bg-success/5" 
                      : "border-border hover:border-primary hover:bg-accent"
                  )}
                  onClick={() => document.getElementById('croqui-upload')?.click()}
                >
                  <input
                    id="croqui-upload"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCroquiFile({ nome: file.name, file });
                        toast({
                          title: 'Croqui anexado',
                          description: `${file.name} foi adicionado com sucesso.`,
                        });
                      }
                      e.target.value = '';
                    }}
                  />
                  {hasCroquiAttachment ? (
                    <div className="flex flex-col items-center gap-2">
                      <Check className="w-10 h-10 text-success" />
                      <p className="font-medium text-success">Croqui anexado</p>
                      <p className="text-sm text-muted-foreground">{croquiFile?.nome}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCroquiFile(null);
                        }}
                      >
                        Remover e enviar outro
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-secondary rounded-full">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">Clique para enviar o croqui</p>
                      <p className="text-sm text-muted-foreground">
                        Imagem (JPG, PNG) ou PDF • Máx. 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fotos */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Fotos do Local</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer border-border hover:border-primary hover:bg-accent"
                  onClick={() => document.getElementById('fotos-upload')?.click()}
                >
                  <input
                    id="fotos-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddFotos(e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-secondary rounded-full">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Clique para adicionar fotos</p>
                    <p className="text-sm text-muted-foreground">
                      Adicione quantas fotos quiser • Imagens (JPG, PNG)
                    </p>
                  </div>
                </div>

                {fotos.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">{fotos.length} foto(s) adicionada(s)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {fotos.map((foto, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                            <img 
                              src={URL.createObjectURL(foto.file)} 
                              alt={foto.nome} 
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFoto(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-muted-foreground truncate mt-1">{foto.nome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Observações das Fotos */}
              <div className="space-y-2">
                <Label htmlFor="obs-fotos">Observações das Fotos</Label>
                <Textarea
                  id="obs-fotos"
                  value={observacoesFotos}
                  onChange={(e) => setObservacoesFotos(e.target.value)}
                  placeholder="Descreva detalhes relevantes sobre as fotos anexadas..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 5: Observações Gerais */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adicionais">Informações Adicionais</Label>
                <Textarea
                  id="adicionais"
                  value={infoAdicionais}
                  onChange={(e) => setInfoAdicionais(e.target.value)}
                  placeholder="Outras informações relevantes para o projeto..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Gerais do Projeto</Label>
                <Textarea
                  id="observacoes"
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  placeholder="Observações internas sobre o projeto..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/projetos')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSubmitting || !condominioNome.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Rascunho
              </Button>

              <Button
                onClick={() => handleSave(true)}
                disabled={!canProceed || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Revisar e Enviar
              </Button>
            </div>
          </div>

          {!hasCroquiAttachment && (
            <p className="text-sm text-muted-foreground text-center">
              * Anexe o croqui para poder revisar e enviar o projeto
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
