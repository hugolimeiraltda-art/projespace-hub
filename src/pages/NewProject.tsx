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
  Loader2,
  Video,
  Image,
  FileText as FileTextIcon
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
  const [croquiFiles, setCroquiFiles] = useState<{ nome: string; file: File }[]>([]);
  const [fotos, setFotos] = useState<{ nome: string; file: File }[]>([]);
  const [observacoesFotos, setObservacoesFotos] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const MAX_FILES = 15;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_IMAGE_WIDTH = 1920;
  const MAX_IMAGE_QUALITY = 0.7;
  const ACCEPTED_FILE_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx';

  const hasCroquiAttachment = croquiFiles.length > 0;

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

  const compressVideoFile = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        const maxHeight = 720;
        const scale = video.videoHeight > maxHeight ? maxHeight / video.videoHeight : 1;
        const width = Math.round(video.videoWidth * scale / 2) * 2;
        const height = Math.round(video.videoHeight * scale / 2) * 2;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        const stream = canvas.captureStream(24);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_000_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: mimeType });
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type: mimeType });
          resolve(compressed);
        };
        recorder.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao comprimir vídeo')); };
        recorder.start();
        video.play();
        const draw = () => {
          if (video.ended || video.paused) { recorder.stop(); return; }
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(draw);
        };
        draw();
        video.onended = () => recorder.stop();
      };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao carregar vídeo')); };
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round(height * (MAX_IMAGE_WIDTH / width));
          width = MAX_IMAGE_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Erro ao comprimir imagem')); return; }
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
            resolve(compressed);
          },
          'image/webp',
          MAX_IMAGE_QUALITY
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao carregar imagem')); };
      img.src = url;
    });
  };

  const processFile = async (file: File): Promise<{ nome: string; file: File }> => {
    // Compress images
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file);
        if (compressed.size < file.size) {
          return { nome: compressed.name, file: compressed };
        }
      } catch {
        // If compression fails, use original
      }
      return { nome: file.name, file };
    }
    // Compress large videos
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      setIsCompressing(true);
      toast({ title: 'Comprimindo vídeo...', description: `${file.name} será reduzido automaticamente.` });
      try {
        const compressed = await compressVideoFile(file);
        toast({ title: 'Vídeo comprimido!', description: `${file.name} reduzido de ${(file.size / 1024 / 1024).toFixed(1)}MB para ${(compressed.size / 1024 / 1024).toFixed(1)}MB` });
        return { nome: compressed.name, file: compressed };
      } finally {
        setIsCompressing(false);
      }
    }
    return { nome: file.name, file };
  };

  const handleAddFiles = async (files: FileList, target: 'croqui' | 'fotos') => {
    const setter = target === 'croqui' ? setCroquiFiles : setFotos;
    const current = target === 'croqui' ? croquiFiles : fotos;
    const remaining = MAX_FILES - current.length;
    
    if (remaining <= 0) {
      toast({ title: 'Limite atingido', description: `Máximo de ${MAX_FILES} arquivos permitido.`, variant: 'destructive' });
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    if (selected.length < files.length) {
      toast({ title: 'Atenção', description: `Apenas ${remaining} arquivo(s) adicionado(s). Limite de ${MAX_FILES}.`, variant: 'destructive' });
    }

    const processed: { nome: string; file: File }[] = [];
    for (const f of selected) {
      processed.push(await processFile(f));
    }
    setter(prev => [...prev, ...processed]);
    toast({ title: 'Arquivos adicionados', description: `${processed.length} arquivo(s) adicionado(s) com sucesso.` });
  };

  const removeFile = (index: number, target: 'croqui' | 'fotos') => {
    const setter = target === 'croqui' ? setCroquiFiles : setFotos;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return FileTextIcon;
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
- Croqui: ${croquiFiles.length > 0 ? `${croquiFiles.length} arquivo(s)` : 'Não'}
- Fotos: ${fotos.length > 0 ? `${fotos.length} arquivo(s)` : 'Não'}

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

      // Upload croqui files
      for (const cf of croquiFiles) {
        const uploadResult = await uploadFile(cf.file, projectId, 'croqui');
        if (uploadResult) {
          await addAttachment(projectId, {
            tipo: 'CROQUI',
            arquivo_url: uploadResult.url,
            nome_arquivo: cf.nome,
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
                  <Input
                    id="prazo"
                    type="date"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Urgência</Label>
                  <div className="flex items-center gap-3 h-10">
                    <span className="text-sm text-muted-foreground">Não</span>
                    <Switch
                      checked={prazoUrgente}
                      onCheckedChange={(checked) => {
                        setPrazoUrgente(checked);
                        if (!checked) setPrazoUrgenteJustificativa('');
                      }}
                    />
                    <span className="text-sm text-muted-foreground">Sim</span>
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
               {/* Croqui - Obrigatório - Até 5 arquivos */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Croqui das Câmeras Novas * <span className="text-sm font-normal text-muted-foreground">({croquiFiles.length}/{MAX_FILES})</span></Label>
                {croquiFiles.length < MAX_FILES && (
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                      isCompressing ? "opacity-50 pointer-events-none" : "",
                      hasCroquiAttachment 
                        ? "border-success bg-success/5 hover:bg-success/10" 
                        : "border-border hover:border-primary hover:bg-accent"
                    )}
                    onClick={() => document.getElementById('croqui-upload')?.click()}
                  >
                    <input
                      id="croqui-upload"
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleAddFiles(e.target.files, 'croqui');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-secondary rounded-full">
                        {isCompressing ? <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <p className="font-medium text-foreground">{isCompressing ? 'Comprimindo vídeo...' : 'Clique para enviar arquivos'}</p>
                      <p className="text-sm text-muted-foreground">
                      PDF, Word, Excel, Imagens e Vídeos • Máx. {MAX_FILES} arquivos • Fotos e vídeos comprimidos automaticamente
                      </p>
                    </div>
                  </div>
                )}

                {croquiFiles.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {croquiFiles.map((item, index) => {
                        const Icon = getFileIcon(item.file);
                        const isImage = item.file.type.startsWith('image/');
                        return (
                          <div key={index} className="relative group flex items-center gap-3 p-3 border rounded-lg bg-card">
                            {isImage ? (
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img src={URL.createObjectURL(item.file)} alt={item.nome} className="object-cover w-full h-full" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.nome}</p>
                              <p className="text-xs text-muted-foreground">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button type="button" onClick={() => removeFile(index, 'croqui')} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fotos do Local - Até 5 arquivos */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Fotos do Local <span className="text-sm font-normal text-muted-foreground">({fotos.length}/{MAX_FILES})</span></Label>
                {fotos.length < MAX_FILES && (
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer border-border hover:border-primary hover:bg-accent",
                      isCompressing ? "opacity-50 pointer-events-none" : ""
                    )}
                    onClick={() => document.getElementById('fotos-upload')?.click()}
                  >
                    <input
                      id="fotos-upload"
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleAddFiles(e.target.files, 'fotos');
                        }
                        e.target.value = '';
                      }}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-secondary rounded-full">
                        {isCompressing ? <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <p className="font-medium text-foreground">{isCompressing ? 'Comprimindo vídeo...' : 'Clique para adicionar arquivos'}</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, Word, Excel, Imagens e Vídeos • Máx. {MAX_FILES} arquivos • Fotos e vídeos comprimidos automaticamente
                      </p>
                    </div>
                  </div>
                )}

                {fotos.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">{fotos.length} arquivo(s) adicionado(s)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fotos.map((foto, index) => {
                        const Icon = getFileIcon(foto.file);
                        const isImage = foto.file.type.startsWith('image/');
                        return (
                          <div key={index} className="relative group flex items-center gap-3 p-3 border rounded-lg bg-card">
                            {isImage ? (
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img src={URL.createObjectURL(foto.file)} alt={foto.nome} className="object-cover w-full h-full" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{foto.nome}</p>
                              <p className="text-xs text-muted-foreground">{(foto.file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button type="button" onClick={() => removeFile(index, 'fotos')} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
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
