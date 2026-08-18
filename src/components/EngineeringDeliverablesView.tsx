import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Package, ClipboardList, FileCheck } from 'lucide-react';
import { useAttachmentUrl } from '@/hooks/useAttachmentUrl';

type DeliverableType = 'PLANTA_CROQUI_DEVOLUCAO' | 'LISTA_EQUIPAMENTOS' | 'LISTA_ATIVIDADES';

const DELIVERABLE_TYPES: { tipo: DeliverableType; label: string; icon: typeof FileText }[] = [
  { tipo: 'PLANTA_CROQUI_DEVOLUCAO', label: 'Planta/Croqui', icon: FileText },
  { tipo: 'LISTA_EQUIPAMENTOS', label: 'Lista de Equipamentos', icon: Package },
  { tipo: 'LISTA_ATIVIDADES', label: 'Lista de Atividades', icon: ClipboardList },
];

interface Props {
  projectId: string;
}

export function EngineeringDeliverablesView({ projectId }: Props) {
  const { openAttachment } = useAttachmentUrl();
  const [files, setFiles] = useState<Array<{ id: string; nome_arquivo: string; tipo: string; arquivo_url: string }>>([]);
  const [laudo, setLaudo] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const load = async () => {
      const [attRes, projRes] = await Promise.all([
        supabase
          .from('project_attachments')
          .select('id, nome_arquivo, tipo, arquivo_url')
          .eq('project_id', projectId)
          .in('tipo', ['PLANTA_CROQUI_DEVOLUCAO', 'LISTA_EQUIPAMENTOS', 'LISTA_ATIVIDADES']),
        supabase.from('projects').select('laudo_projeto').eq('id', projectId).maybeSingle(),
      ]);
      if (!active) return;
      if (attRes.data) setFiles(attRes.data as typeof files);
      setLaudo(projRes.data?.laudo_projeto ?? null);
    };
    load();
    return () => { active = false; };
  }, [projectId]);

  if (files.length === 0 && !laudo) return null;

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          Devolução do Projeto (Engenharia)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DELIVERABLE_TYPES.map(({ tipo, label, icon: Icon }) => {
            const list = files.filter((f) => f.tipo === tipo);
            return (
              <div key={tipo}>
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </p>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum arquivo</p>
                ) : (
                  <div className="space-y-1">
                    {list.map((f) => (
                      <Button
                        key={f.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2"
                        onClick={() => openAttachment(f.arquivo_url, f.nome_arquivo)}
                      >
                        <span className="truncate">{f.nome_arquivo}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {laudo && (
          <div>
            <p className="text-sm font-medium mb-1">Laudo do Projeto</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{laudo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
