import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Save, Package, ClipboardList, FileCheck } from 'lucide-react';
import { ProjectWithDetails, ATTACHMENT_TYPE_LABELS, AttachmentType, Project, TapForm, Attachment } from '@/types/project';

interface EngineeringDeliverablesProps {
  project: ProjectWithDetails;
  canChangeStatus: boolean;
  user: { role: string } | null;
  addAttachment: (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>) => Promise<boolean>;
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
  updateProject 
}: EngineeringDeliverablesProps) {
  const { toast } = useToast();
  const [laudo, setLaudo] = useState(project.laudo_projeto || '');
  const [isSaving, setIsSaving] = useState(false);

  // Get existing deliverables
  const getDeliverablesByType = (tipo: DeliverableType) => 
    project.attachments.filter(a => a.tipo === tipo);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: DeliverableType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}/${tipo}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Fallback to blob URL
        const blobUrl = URL.createObjectURL(file);
        await addAttachment(project.id, {
          tipo: tipo,
          arquivo_url: blobUrl,
          nome_arquivo: file.name,
        });
      } else {
        // Get signed URL (bucket is now private)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365); // 1 year expiry
        
        const fileUrl = signedUrlError ? URL.createObjectURL(file) : signedUrlData.signedUrl;
        
        await addAttachment(project.id, {
          tipo: tipo,
          arquivo_url: fileUrl,
          nome_arquivo: file.name,
        });
      }
    }

    toast({
      title: 'Arquivo(s) anexado(s)',
      description: `${files.length} arquivo(s) adicionado(s) com sucesso.`,
    });

    e.target.value = '';
  };

  const handleSaveLaudo = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, { laudo_projeto: laudo });
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

  // Show this section only if:
  // - User is projetista/admin (can edit deliverables)
  // - Or there are deliverables to show (vendedor can view)
  const hasDeliverables = DELIVERABLE_TYPES.some(d => getDeliverablesByType(d.tipo).length > 0) || project.laudo_projeto;
  
  if (!canChangeStatus && !hasDeliverables) {
    return null;
  }

  return (
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
                {files.map(att => (
                  <a
                    key={att.id}
                    href={att.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">{ATTACHMENT_TYPE_LABELS[att.tipo]}</p>
                    </div>
                  </a>
                ))}
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
  );
}