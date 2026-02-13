import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Save, Package, ClipboardList, FileCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { ProjectWithDetails, ATTACHMENT_TYPE_LABELS, AttachmentType, Project, TapForm, Attachment } from '@/types/project';
import { isBlobUrl, useAttachmentUrl } from '@/hooks/useAttachmentUrl';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EngineeringDeliverablesProps {
  project: ProjectWithDetails;
  canChangeStatus: boolean;
  user: { role: string; id: string; nome: string } | null;
  addAttachment: (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>) => Promise<boolean>;
  removeAttachment: (projectId: string, attachmentId: string) => Promise<boolean>;
  addComment: (projectId: string, comment: { user_id: string; user_name: string; content: string; is_internal: boolean }) => Promise<boolean>;
  updateProject: (id: string, project: Partial<Project>, tapForm?: Partial<TapForm>) => Promise<boolean>;
}

type DeliverableType = 'PLANTA_CROQUI_DEVOLUCAO' | 'LISTA_EQUIPAMENTOS' | 'LISTA_ATIVIDADES';

const DELIVERABLE_TYPES: { tipo: DeliverableType; label: string; icon: typeof FileText }[] = [
  { tipo: 'PLANTA_CROQUI_DEVOLUCAO', label: 'Planta/Croqui', icon: FileText },
  { tipo: 'LISTA_EQUIPAMENTOS', label: 'Lista de Equipamentos', icon: Package },
  { tipo: 'LISTA_ATIVIDADES', label: 'Lista de Atividades', icon: ClipboardList },
];

export function EngineeringDeliverables({ 
  project, 
  canChangeStatus, 
  user,
  addAttachment,
  removeAttachment,
  addComment,
  updateProject 
}: EngineeringDeliverablesProps) {
  const { toast } = useToast();
  const { openAttachment } = useAttachmentUrl();
  const [laudo, setLaudo] = useState(project.laudo_projeto || '');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string; tipo: string } | null>(null);

  const getDeliverablesByType = (tipo: DeliverableType) => 
    project.attachments.filter(a => a.tipo === tipo);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: DeliverableType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const tipoLabel = DELIVERABLE_TYPES.find(d => d.tipo === tipo)?.label || tipo;

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}/${tipo}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        const blobUrl = URL.createObjectURL(file);
        await addAttachment(project.id, {
          tipo: tipo,
          arquivo_url: blobUrl,
          nome_arquivo: file.name,
        });
      } else {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);
        
        const fileUrl = signedUrlError ? URL.createObjectURL(file) : signedUrlData.signedUrl;
        
        await addAttachment(project.id, {
          tipo: tipo,
          arquivo_url: fileUrl,
          nome_arquivo: file.name,
        });
      }
    }

    // Log comment
    if (user) {
      await addComment(project.id, {
        user_id: user.id,
        user_name: user.nome,
        content: `📎 Anexou ${files.length} arquivo(s) em "${tipoLabel}": ${Array.from(files).map(f => f.name).join(', ')}`,
        is_internal: false,
      });
    }

    toast({
      title: 'Arquivo(s) anexado(s)',
      description: `${files.length} arquivo(s) adicionado(s) com sucesso.`,
    });

    e.target.value = '';
  };

  const handleDeleteAttachment = async () => {
    if (!deleteTarget || !user) return;

    const success = await removeAttachment(project.id, deleteTarget.id);
    if (success) {
      const tipoLabel = DELIVERABLE_TYPES.find(d => d.tipo === deleteTarget.tipo)?.label || deleteTarget.tipo;
      
      await addComment(project.id, {
        user_id: user.id,
        user_name: user.nome,
        content: `🗑️ Removeu arquivo de "${tipoLabel}": ${deleteTarget.nome}`,
        is_internal: false,
      });

      toast({
        title: 'Arquivo removido',
        description: `"${deleteTarget.nome}" foi removido com sucesso.`,
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o arquivo.',
        variant: 'destructive',
      });
    }
    setDeleteTarget(null);
  };

  const handleSaveLaudo = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, { laudo_projeto: laudo });
      
      if (user) {
        await addComment(project.id, {
          user_id: user.id,
          user_name: user.nome,
          content: `📝 Atualizou o laudo do projeto.`,
          is_internal: false,
        });
      }

      toast({
        title: 'Laudo salvo',
        description: 'O laudo do projeto foi salvo com sucesso.',
      });
    } catch (error) {
      console.error('Error saving laudo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o laudo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasDeliverables = DELIVERABLE_TYPES.some(d => getDeliverablesByType(d.tipo).length > 0) || project.laudo_projeto;
  
  if (!canChangeStatus && !hasDeliverables) {
    return null;
  }

  return (
    <>
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Devolução do Projeto (Engenharia)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Sections - Only for projetista/admin */}
          {canChangeStatus && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Anexe os arquivos de devolução para o vendedor:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DELIVERABLE_TYPES.map(({ tipo, label, icon: Icon }) => (
                  <div key={tipo} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </Label>
                    <input
                      id={`upload-${tipo}`}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, tipo)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById(`upload-${tipo}`)?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display existing deliverables */}
          {DELIVERABLE_TYPES.map(({ tipo, label, icon: Icon }) => {
            const files = getDeliverablesByType(tipo);
            if (files.length === 0) return null;
            
            return (
              <div key={tipo} className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map(att => {
                    const broken = isBlobUrl(att.arquivo_url);
                    return (
                      <div key={att.id} className="flex items-center gap-1">
                        <a
                          href={broken ? undefined : att.arquivo_url}
                          onClick={(e) => openAttachment(att.arquivo_url, e)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors",
                            broken
                              ? "bg-destructive/10 border-destructive/30 cursor-not-allowed opacity-60"
                              : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                          )}
                          title={broken ? "Arquivo indisponível — reenvie" : undefined}
                        >
                          {broken ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{att.nome_arquivo}</p>
                            <p className="text-xs text-muted-foreground">
                              {broken ? 'Arquivo indisponível — reenvie' : ATTACHMENT_TYPE_LABELS[att.tipo]}
                            </p>
                          </div>
                        </a>
                        {canChangeStatus && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: att.id, nome: att.nome_arquivo, tipo: att.tipo })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Laudo Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Laudo do Projeto
            </Label>
            {canChangeStatus ? (
              <>
                <Textarea
                  value={laudo}
                  onChange={(e) => setLaudo(e.target.value)}
                  placeholder="Descreva o laudo técnico do projeto..."
                  rows={5}
                />
                <Button 
                  onClick={handleSaveLaudo}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Laudo'}
                </Button>
              </>
            ) : project.laudo_projeto ? (
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{project.laudo_projeto}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhum laudo disponível.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAttachment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
