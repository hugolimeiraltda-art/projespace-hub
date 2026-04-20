import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAttachmentUrl } from '@/hooks/useAttachmentUrl';
import { ArrowLeft, FileText, Package, ClipboardList, Image as ImageIcon, CheckCircle2, AlertTriangle, Loader2, Upload, X } from 'lucide-react';
import { EquipmentListDialog } from '@/components/EquipmentListDialog';

export default function RevisaoVenda() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, projects } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openAttachment } = useAttachmentUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);
  const [mesmoProjeto, setMesmoProjeto] = useState<'sim' | 'nao' | ''>('');
  const [alteracoes, setAlteracoes] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [propostaFile, setPropostaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);

  useEffect(() => {
    setProject(getProject(id!));
  }, [id, projects, getProject]);

  if (!project) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Carregando projeto...</div>
      </Layout>
    );
  }

  const engineeringFiles = project.attachments.filter(a =>
    ['PLANTA_CROQUI_DEVOLUCAO', 'LISTA_EQUIPAMENTOS', 'LISTA_ATIVIDADES'].includes(a.tipo)
  );
  const projectPhotos = project.attachments.filter(a =>
    ['IMAGENS', 'PLANTA_BAIXA', 'CROQUI', 'FOTOS_EQUIP_APROVEITADOS'].includes(a.tipo)
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'A proposta deve ter no máximo 20MB.', variant: 'destructive' });
      return;
    }
    setPropostaFile(file);
  };

  const uploadProposta = async (): Promise<{ url: string; nome: string } | null> => {
    if (!propostaFile) return null;
    const ext = propostaFile.name.split('.').pop();
    const path = `${project.id}/proposta-fechada-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('project-attachments')
      .upload(path, propostaFile, { upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from('project-attachments').getPublicUrl(path);
    return { url: pub.publicUrl, nome: propostaFile.name };
  };

  const handleSubmit = async () => {
    if (!mesmoProjeto) {
      toast({ title: 'Responda a pergunta', description: 'Informe se o projeto vendido foi o mesmo projetado.', variant: 'destructive' });
      return;
    }
    if (!propostaFile) {
      toast({ title: 'Proposta obrigatória', description: 'Anexe a proposta fechada com o cliente.', variant: 'destructive' });
      return;
    }
    if (mesmoProjeto === 'nao' && (!alteracoes.trim() || !justificativa.trim())) {
      toast({ title: 'Campos obrigatórios', description: 'Descreva as alterações e justifique o motivo.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const proposta = await uploadProposta();

      const { error: insertError } = await supabase.from('sale_validations').insert({
        project_id: project.id,
        submitted_by: user?.id,
        submitted_by_name: user?.nome,
        mesmo_projeto: mesmoProjeto === 'sim',
        alteracoes: mesmoProjeto === 'nao' ? alteracoes : null,
        justificativa_alteracoes: mesmoProjeto === 'nao' ? justificativa : null,
        proposta_fechada_url: proposta?.url ?? null,
        proposta_fechada_nome: proposta?.nome ?? null,
        validation_status: 'PENDENTE',
      });
      if (insertError) throw insertError;

      await supabase
        .from('projects')
        .update({ sale_status: 'AGUARDANDO_VALIDACAO_ENGENHARIA' as any })
        .eq('id', project.id);

      await supabase.from('project_notifications').insert({
        project_id: project.id,
        type: 'SALE_VALIDATION_REQUESTED',
        title: 'Nova validação de venda',
        message: `O projeto "${project.cliente_condominio_nome}" aguarda validação da engenharia.`,
        read: false,
        for_role: 'projetos',
      });

      try {
        await supabase.functions.invoke('send-status-email', {
          body: {
            to_role: 'projetos',
            subject: `Validação de venda pendente - ${project.cliente_condominio_nome}`,
            message: `O vendedor ${user?.nome} enviou o projeto "${project.cliente_condominio_nome}" para validação da engenharia.\n\nMesmo projeto: ${mesmoProjeto === 'sim' ? 'Sim' : 'Não'}${mesmoProjeto === 'nao' ? `\n\nAlterações: ${alteracoes}\n\nJustificativa: ${justificativa}` : ''}\n\nProposta fechada: ${proposta?.nome ?? 'não anexada'}`,
          },
        });
      } catch (e) {
        console.warn('Email not sent:', e);
      }

      toast({ title: 'Enviado para validação!', description: 'A engenharia foi notificada e irá validar a venda.' });
      navigate(`/projetos/${project.id}`);
    } catch (error) {
      console.error('Erro ao enviar validação:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar para validação.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/projetos/${project.id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Revisão da Venda</h1>
          <p className="text-muted-foreground">{project.cliente_condominio_nome}</p>
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Revise os arquivos entregues pela engenharia e confirme se o projeto vendido foi o mesmo projetado antes de enviar para implantação.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" /> Arquivos da Devolução da Engenharia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {engineeringFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum arquivo de devolução encontrado.</p>
            ) : (
              engineeringFiles.map(att => (
                <button
                  key={att.id}
                  onClick={() => openAttachment(att.arquivo_url, undefined, att.nome_arquivo)}
                  className="flex items-center gap-3 w-full p-3 border rounded-md hover:bg-accent text-left"
                >
                  {att.tipo === 'LISTA_EQUIPAMENTOS' ? <Package className="w-4 h-4" /> :
                   att.tipo === 'LISTA_ATIVIDADES' ? <ClipboardList className="w-4 h-4" /> :
                   <FileText className="w-4 h-4" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{att.tipo.replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))
            )}
            <Button variant="outline" size="sm" onClick={() => setShowEquipmentDialog(true)} className="w-full mt-2">
              <Package className="w-4 h-4 mr-2" /> Ver Lista Extraída de Equipamentos (IA)
            </Button>
          </CardContent>
        </Card>

        {projectPhotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-5 h-5" /> Fotos e Plantas do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectPhotos.map(att => (
                <button
                  key={att.id}
                  onClick={() => openAttachment(att.arquivo_url, undefined, att.nome_arquivo)}
                  className="flex items-center gap-3 w-full p-3 border rounded-md hover:bg-accent text-left"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm truncate flex-1">{att.nome_arquivo}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmação do Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">O projeto vendido foi o mesmo projetado pela engenharia?</Label>
              <RadioGroup value={mesmoProjeto} onValueChange={(v) => setMesmoProjeto(v as 'sim' | 'nao')} className="mt-3">
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="sim" id="sim" />
                  <Label htmlFor="sim" className="cursor-pointer flex-1">Sim, vendi exatamente o que foi projetado</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="nao" id="nao" />
                  <Label htmlFor="nao" className="cursor-pointer flex-1">Não, houve alterações</Label>
                </div>
              </RadioGroup>
            </div>

            {mesmoProjeto === 'nao' && (
              <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div>
                  <Label htmlFor="alteracoes">Quais foram as alterações? *</Label>
                  <Textarea
                    id="alteracoes"
                    value={alteracoes}
                    onChange={(e) => setAlteracoes(e.target.value)}
                    placeholder="Descreva detalhadamente o que mudou em relação ao projeto original..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="justificativa">Por que as alterações foram feitas? *</Label>
                  <Textarea
                    id="justificativa"
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Justifique o motivo das alterações..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Proposta fechada — SEMPRE obrigatória */}
            <div className="space-y-2 p-4 border-2 border-dashed border-primary/40 rounded-md bg-primary/5">
              <Label className="text-base font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" /> Proposta fechada com o cliente *
              </Label>
              <p className="text-xs text-muted-foreground">
                Anexe obrigatoriamente o PDF/imagem da proposta assinada ou aceita pelo cliente.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!propostaFile ? (
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Selecionar arquivo da proposta
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-background border rounded-md">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{propostaFile.name}</span>
                  <span className="text-xs text-muted-foreground">{(propostaFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setPropostaFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate(`/projetos/${project.id}`)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !mesmoProjeto || !propostaFile}
            className="bg-status-approved hover:bg-status-approved/90"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para Validação da Engenharia</>}
          </Button>
        </div>
      </div>

      <EquipmentListDialog
        open={showEquipmentDialog}
        onOpenChange={setShowEquipmentDialog}
        projectId={project.id}
        projectName={project.cliente_condominio_nome}
        engineeringStatus={project.engineering_status}
      />
    </Layout>
  );
}
