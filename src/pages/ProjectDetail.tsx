import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  Copy,
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Send,
  User,
  Check,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { ProjectStatus, STATUS_LABELS, ATTACHMENT_TYPE_LABELS, PORTARIA_VIRTUAL_LABELS, CFTV_ELEVADOR_LABELS } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, updateStatus, addComment } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const project = getProject(id!);

  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | ''>('');

  if (!project) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Projeto não encontrado</h1>
          <Button className="mt-4" onClick={() => navigate('/projetos')}>
            Voltar para Projetos
          </Button>
        </div>
      </Layout>
    );
  }

  const canEdit = user?.role === 'vendedor' && ['RASCUNHO', 'PENDENTE_INFO'].includes(project.status);
  const canChangeStatus = user?.role === 'projetos' || user?.role === 'admin';

  const handleCopyEmail = () => {
    if (project.email_padrao_gerado) {
      navigator.clipboard.writeText(project.email_padrao_gerado);
      toast({
        title: 'Copiado!',
        description: 'O conteúdo do e-mail foi copiado para a área de transferência.',
      });
    }
  };

  const handleDownloadEmail = () => {
    if (project.email_padrao_gerado) {
      const blob = new Blob([project.email_padrao_gerado], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projeto_${project.cliente_condominio_nome.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleStatusChange = () => {
    if (!selectedStatus || !user) return;
    updateStatus(project.id, selectedStatus, user.id, user.nome);
    setSelectedStatus('');
    toast({
      title: 'Status atualizado',
      description: `O projeto foi marcado como "${STATUS_LABELS[selectedStatus]}".`,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(project.id, {
      user_id: user.id,
      user_name: user.nome,
      content: newComment,
      is_internal: isInternalComment,
    });
    setNewComment('');
    toast({
      title: 'Comentário adicionado',
    });
  };

  const tap = project.tap_form;

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{project.cliente_condominio_nome}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {project.cliente_cidade}, {project.cliente_estado}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {project.vendedor_nome}
              </span>
              {project.prazo_entrega_projeto && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Prazo: {format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/projetos/${project.id}/editar`)}>
                Editar TAP
              </Button>
            )}
            <Button variant="outline" disabled>
              <Lock className="w-4 h-4 mr-2" />
              Iniciar Venda Concluída (Form 2)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Generated */}
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">E-mail Gerado</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyEmail}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadEmail}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar .txt
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-secondary p-4 rounded-lg font-mono text-foreground">
                  {project.email_padrao_gerado || 'E-mail não gerado'}
                </pre>
              </CardContent>
            </Card>

            {/* TAP Summary */}
            {tap && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do TAP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Portaria Virtual</p>
                      <p className="font-medium">{PORTARIA_VIRTUAL_LABELS[tap.portaria_virtual_atendimento_app]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Nº Blocos</p>
                      <p className="font-medium">{tap.numero_blocos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Interfonia</p>
                      <p className="font-medium">{tap.interfonia ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">CFTV Elevador</p>
                      <p className="font-medium">{CFTV_ELEVADOR_LABELS[tap.cftv_elevador_possui]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Croqui Confirmado</p>
                      <p className="font-medium flex items-center gap-1">
                        {tap.marcacao_croqui_confirmada ? (
                          <><Check className="w-4 h-4 text-success" /> Sim</>
                        ) : (
                          <><AlertTriangle className="w-4 h-4 text-warning" /> Não</>
                        )}
                      </p>
                    </div>
                  </div>

                  {tap.controle_acessos_pedestre_descricao && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Controle Pedestre</p>
                      <p className="text-sm">{tap.controle_acessos_pedestre_descricao}</p>
                    </div>
                  )}

                  {tap.controle_acessos_veiculo_descricao && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Controle Veículo</p>
                      <p className="text-sm">{tap.controle_acessos_veiculo_descricao}</p>
                    </div>
                  )}

                  {tap.alarme_descricao && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Alarme</p>
                      <p className="text-sm">{tap.alarme_descricao}</p>
                    </div>
                  )}

                  {tap.cftv_dvr_descricao && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">CFTV/DVR</p>
                      <p className="text-sm">{tap.cftv_dvr_descricao}</p>
                    </div>
                  )}

                  <Alert className="bg-status-pending-bg border-status-pending/30">
                    <AlertTriangle className="h-4 w-4 text-status-pending" />
                    <AlertDescription className="text-foreground">
                      <strong>Observação:</strong> Não vamos assumir as câmeras do prédio/condomínio.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Anexos</CardTitle>
              </CardHeader>
              <CardContent>
                {project.attachments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum anexo</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.nome_arquivo}</p>
                          <p className="text-xs text-muted-foreground">{ATTACHMENT_TYPE_LABELS[att.tipo]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comentários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum comentário</p>
                ) : (
                  <div className="space-y-3">
                    {project.comments.map(comment => (
                      <div key={comment.id} className="p-3 bg-secondary rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comment.user_name}</span>
                          <div className="flex items-center gap-2">
                            {comment.is_internal && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                                Interno
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="pt-4 border-t border-border">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar comentário..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    {(user?.role === 'projetos' || user?.role === 'admin') && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="rounded"
                        />
                        Comentário interno (visível apenas para Projetos)
                      </label>
                    )}
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Change */}
            {canChangeStatus && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Alterar Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} disabled={value === project.status}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={handleStatusChange} disabled={!selectedStatus}>
                    Atualizar Status
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.status_history.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma alteração registrada</p>
                  ) : (
                    project.status_history.slice().reverse().map((change, index) => (
                      <div key={change.id} className="flex gap-3">
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          {index < project.status_history.length - 1 && (
                            <div className="absolute top-4 left-0.5 w-0.5 h-full bg-border" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium">
                            {STATUS_LABELS[change.old_status]} → {STATUS_LABELS[change.new_status]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por {change.user_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(change.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Endereço</p>
                  <p className="font-medium">{project.endereco_condominio || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {format(parseISO(project.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última atualização</p>
                  <p className="font-medium">
                    {format(parseISO(project.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {project.data_assembleia && (
                  <div>
                    <p className="text-muted-foreground">Data Assembleia</p>
                    <p className="font-medium">
                      {format(parseISO(project.data_assembleia), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
