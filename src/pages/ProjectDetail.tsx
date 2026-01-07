import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { EngineeringTimeline } from '@/components/EngineeringTimeline';
import { EngineeringDeliverables } from '@/components/EngineeringDeliverables';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getChangedFields, isFieldChanged } from '@/lib/changeTracking';
import { cn } from '@/lib/utils';
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
  CheckCircle2,
  ShoppingCart,
  Upload,
  Hash
} from 'lucide-react';
import { ProjectStatus, STATUS_LABELS, ATTACHMENT_TYPE_LABELS, PORTARIA_VIRTUAL_LABELS, CFTV_ELEVADOR_LABELS, ENGINEERING_STATUS_LABELS, EngineeringStatus, SALE_STATUS_LABELS } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, updateStatus, updateEngineeringStatus, addComment, markProjectCompleted, addAttachment, updateProject, projects } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | ''>('');
  const [selectedEngineeringStatus, setSelectedEngineeringStatus] = useState<EngineeringStatus | ''>('');
  const [showPendingInfoDialog, setShowPendingInfoDialog] = useState(false);
  const [pendingInfoReason, setPendingInfoReason] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Watch for project changes in the context
  useEffect(() => {
    const foundProject = getProject(id!);
    setProject(foundProject);
    setIsLoading(false);
  }, [id, projects, getProject]);

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando projeto...</p>
        </div>
      </Layout>
    );
  }

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
  const canMarkCompleted = canChangeStatus && project.engineering_status !== 'CONCLUIDO';
  const canStartSaleForm = user?.role === 'vendedor' && project.engineering_status === 'CONCLUIDO' && project.sale_status === 'NAO_INICIADO';
  const canViewSaleForm = project.sale_status && project.sale_status !== 'NAO_INICIADO';

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

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    const checkNewPage = (neededSpace: number = 30) => {
      if (yPosition > 280 - neededSpace) {
        doc.addPage();
        yPosition = 20;
      }
    };

    const addSectionTitle = (title: string) => {
      checkNewPage(20);
      yPosition += 5;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text(title, 20, yPosition + 2);
      yPosition += 15;
      doc.setTextColor(0, 0, 0);
    };

    const addField = (label: string, value: string, inline = true) => {
      checkNewPage();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      if (inline) {
        doc.text(value || '-', 75, yPosition);
        yPosition += 7;
      } else {
        yPosition += 6;
        const lines = doc.splitTextToSize(value || '-', pageWidth - 45);
        lines.forEach((line: string) => {
          checkNewPage();
          doc.text(line, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO PROJETO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    doc.setFontSize(16);
    doc.text(project.cliente_condominio_nome, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Basic Info Section
    addSectionTitle('INFORMAÇÕES GERAIS');
    addField('Vendedor', project.vendedor_nome);
    addField('Email', project.vendedor_email);
    addField('Cidade', `${project.cliente_cidade}, ${project.cliente_estado}`);
    addField('Endereço', project.endereco_condominio);
    addField('Status', STATUS_LABELS[project.status]);
    if (project.engineering_status) {
      addField('Status Engenharia', ENGINEERING_STATUS_LABELS[project.engineering_status]);
    }
    if (project.prazo_entrega_projeto) {
      addField('Prazo de Entrega', format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR }));
    }
    if (project.data_assembleia) {
      addField('Data Assembleia', format(parseISO(project.data_assembleia), "dd/MM/yyyy", { locale: ptBR }));
    }

    // TAP Section
    if (tap) {
      addSectionTitle('RESUMO DO TAP');
      addField('Portaria Virtual', PORTARIA_VIRTUAL_LABELS[tap.portaria_virtual_atendimento_app]);
      addField('Nº de Blocos', String(tap.numero_blocos));
      addField('Interfonia', tap.interfonia ? 'Sim' : 'Não');
      addField('CFTV Elevador', CFTV_ELEVADOR_LABELS[tap.cftv_elevador_possui]);
      addField('Croqui Confirmado', tap.marcacao_croqui_confirmada ? 'Sim' : 'Não');
      
      if (tap.controle_acessos_pedestre_descricao) {
        addField('Controle Pedestre', tap.controle_acessos_pedestre_descricao, false);
      }
      if (tap.controle_acessos_veiculo_descricao) {
        addField('Controle Veículo', tap.controle_acessos_veiculo_descricao, false);
      }
      if (tap.alarme_descricao) {
        addField('Alarme', tap.alarme_descricao, false);
      }
      if (tap.cftv_dvr_descricao) {
        addField('CFTV/DVR', tap.cftv_dvr_descricao, false);
      }
      if (tap.info_adicionais) {
        addField('Informações Adicionais', tap.info_adicionais, false);
      }
    }

    // Email Content Section
    if (project.email_padrao_gerado) {
      addSectionTitle('CONTEÚDO DO E-MAIL');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const emailLines = doc.splitTextToSize(project.email_padrao_gerado, pageWidth - 40);
      emailLines.forEach((line: string) => {
        checkNewPage();
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
    }

    // Attachments Section
    if (project.attachments.length > 0) {
      addSectionTitle('ANEXOS');
      
      // List attachments
      doc.setFontSize(10);
      project.attachments.forEach((att, index) => {
        checkNewPage();
        doc.setFont('helvetica', 'normal');
        doc.text(`${index + 1}. ${att.nome_arquivo}`, 25, yPosition);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(`(${ATTACHMENT_TYPE_LABELS[att.tipo]})`, 25, yPosition + 4);
        doc.setFontSize(10);
        yPosition += 12;
      });

      // Try to embed images
      const imageAttachments = project.attachments.filter(att => 
        att.nome_arquivo.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
        att.tipo === 'IMAGENS' || att.tipo === 'FOTOS_EQUIP_APROVEITADOS'
      );

      if (imageAttachments.length > 0) {
        addSectionTitle('IMAGENS ANEXADAS');
        
        for (const att of imageAttachments) {
          try {
            // For blob URLs or data URLs
            if (att.arquivo_url.startsWith('blob:') || att.arquivo_url.startsWith('data:')) {
              checkNewPage(70);
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              doc.text(`${att.nome_arquivo}`, 20, yPosition);
              yPosition += 5;
              
              // Try to add image
              try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = () => reject();
                  img.src = att.arquivo_url;
                });
                
                const canvas = document.createElement('canvas');
                const maxWidth = 170;
                const maxHeight = 100;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
                
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                checkNewPage(height / 2 + 10);
                doc.addImage(dataUrl, 'JPEG', 20, yPosition, width / 2, height / 2);
                yPosition += height / 2 + 10;
              } catch {
                doc.text('[Imagem não disponível para exibição no PDF]', 25, yPosition);
                yPosition += 10;
              }
            }
          } catch {
            // Skip image if can't be processed
          }
        }
      }
    }

    // Comments Section
    if (project.comments.length > 0) {
      addSectionTitle('COMENTÁRIOS');
      
      project.comments.forEach((comment) => {
        checkNewPage(25);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(comment.user_name, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(` - ${format(parseISO(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20 + doc.getTextWidth(comment.user_name), yPosition);
        doc.setTextColor(0, 0, 0);
        if (comment.is_internal) {
          doc.setTextColor(200, 100, 0);
          doc.text(' [Interno]', 20 + doc.getTextWidth(comment.user_name + ` - ${format(parseISO(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`), yPosition);
          doc.setTextColor(0, 0, 0);
        }
        yPosition += 5;
        
        const commentLines = doc.splitTextToSize(comment.content, pageWidth - 50);
        commentLines.forEach((line: string) => {
          checkNewPage();
          doc.text(line, 25, yPosition);
          yPosition += 4;
        });
        yPosition += 5;
      });
    }

    // Status History Section
    if (project.status_history.length > 0) {
      addSectionTitle('HISTÓRICO DE STATUS');
      
      project.status_history.forEach((change) => {
        checkNewPage();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const dateStr = format(parseISO(change.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
        doc.text(`• ${dateStr} - ${change.user_name}: ${STATUS_LABELS[change.old_status]} → ${STATUS_LABELS[change.new_status]}`, 20, yPosition);
        yPosition += 6;
      });
    }

    // Observations
    if (project.observacoes_gerais) {
      addSectionTitle('OBSERVAÇÕES GERAIS');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const obsLines = doc.splitTextToSize(project.observacoes_gerais, pageWidth - 40);
      obsLines.forEach((line: string) => {
        checkNewPage();
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
    }

    // Save PDF
    doc.save(`projeto_${project.cliente_condominio_nome.replace(/\s+/g, '_')}.pdf`);

    toast({
      title: 'PDF gerado com sucesso!',
      description: 'O arquivo completo do projeto foi baixado.',
    });
  };

  const sendStatusEmail = async (newStatus: ProjectStatus, comment?: string) => {
    try {
      setIsSendingEmail(true);
      console.log('Sending status change email...');
      
      const { data, error } = await supabase.functions.invoke('send-status-email', {
        body: {
          vendedor_email: project.vendedor_email,
          vendedor_nome: project.vendedor_nome,
          projeto_nome: project.cliente_condominio_nome,
          projeto_id: project.id,
          old_status: project.status,
          new_status: newStatus,
          new_status_label: STATUS_LABELS[newStatus],
          changed_by: user?.nome || 'Sistema',
          comment: comment,
        },
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: 'Aviso',
          description: 'Status atualizado, mas houve um erro ao enviar o email de notificação.',
          variant: 'destructive',
        });
      } else {
        console.log('Email sent successfully:', data);
      }
    } catch (err) {
      console.error('Error invoking edge function:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || !user) return;
    
    // Se for PENDENTE_INFO, abrir dialog para pedir motivo
    if (selectedStatus === 'PENDENTE_INFO') {
      setShowPendingInfoDialog(true);
      return;
    }
    
    // Para outros status, atualizar normalmente
    updateStatus(project.id, selectedStatus, user.id, user.nome);
    
    // Enviar email de notificação
    await sendStatusEmail(selectedStatus);
    
    setSelectedStatus('');
    toast({
      title: 'Status atualizado',
      description: `O projeto foi marcado como "${STATUS_LABELS[selectedStatus]}".`,
    });
  };

  const handleConfirmPendingInfo = async () => {
    if (!pendingInfoReason.trim() || !user) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe o motivo da pendência.',
        variant: 'destructive',
      });
      return;
    }
    
    // Adicionar comentário com o motivo
    addComment(project.id, {
      user_id: user.id,
      user_name: user.nome,
      content: `⚠️ INFORMAÇÃO PENDENTE: ${pendingInfoReason}`,
      is_internal: false,
    });
    
    // Atualizar status
    updateStatus(project.id, 'PENDENTE_INFO', user.id, user.nome);
    
    // Enviar email com o motivo
    await sendStatusEmail('PENDENTE_INFO', pendingInfoReason);
    
    // Limpar e fechar
    setShowPendingInfoDialog(false);
    setPendingInfoReason('');
    setSelectedStatus('');
    
    toast({
      title: 'Status atualizado',
      description: 'O vendedor foi notificado sobre as informações pendentes.',
    });
  };

  const handleEngineeringStatusChange = () => {
    if (!selectedEngineeringStatus || !user) return;
    updateEngineeringStatus(project.id, selectedEngineeringStatus, user.id, user.nome);
    setSelectedEngineeringStatus('');
    toast({
      title: 'Status de engenharia atualizado',
      description: `O status foi alterado para "${ENGINEERING_STATUS_LABELS[selectedEngineeringStatus]}".`,
    });
  };

  const handleMarkCompleted = () => {
    if (!user) return;
    markProjectCompleted(project.id, user.id, user.nome);
    toast({
      title: 'Projeto concluído!',
      description: 'O solicitante será notificado sobre a conclusão do projeto.',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        addAttachment(project.id, {
          tipo: 'OUTROS',
          arquivo_url: URL.createObjectURL(file),
          nome_arquivo: file.name,
        });
      });
      toast({
        title: 'Arquivos anexados',
        description: `${files.length} arquivo(s) adicionado(s).`,
      });
    }
    e.target.value = '';
  };

  const tap = project.tap_form;
  
  // Get changed fields for highlighting
  const changedFields = useMemo(() => getChangedFields(project), [project]);
  const hasChanges = changedFields.size > 0;

  // Helper for changed field styling
  const changedStyle = (fieldName: string) => isFieldChanged(changedFields, fieldName) 
    ? 'bg-amber-50 border-l-4 border-amber-400 pl-2 -ml-2' 
    : '';

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
              {project.numero_projeto && (
                <span className="flex items-center gap-1 text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  <Hash className="w-3 h-3" />
                  {project.numero_projeto}
                </span>
              )}
              <h1 className="text-2xl font-bold text-foreground">{project.cliente_condominio_nome}</h1>
              <StatusBadge status={project.status} />
              {project.sale_status && project.sale_status !== 'NAO_INICIADO' && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  Venda: {SALE_STATUS_LABELS[project.sale_status]}
                </span>
              )}
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
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/projetos/${project.id}/editar`)}>
                Editar TAP
              </Button>
            )}
            {canStartSaleForm && (
              <Button 
                className="bg-status-approved hover:bg-status-approved/90"
                onClick={() => navigate(`/projetos/${project.id}/form2`)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Projeto Vendido
              </Button>
            )}
            {canViewSaleForm && (
              <Button 
                variant="outline"
                onClick={() => navigate(`/projetos/${project.id}/form2`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver Venda Concluída
              </Button>
            )}
          </div>
        </div>

        {/* Notification for completed project */}
        {project.engineering_status === 'CONCLUIDO' && user?.role === 'vendedor' && project.sale_status === 'NAO_INICIADO' && (
          <Alert className="mb-6 bg-status-approved-bg border-status-approved/30">
            <CheckCircle2 className="w-4 h-4 text-status-approved" />
            <AlertDescription className="text-foreground flex items-center justify-between">
              <span>
                <strong>Projeto concluído pela engenharia!</strong> Você pode agora informar que o projeto foi vendido.
              </span>
              <Button 
                size="sm" 
                className="bg-status-approved hover:bg-status-approved/90"
                onClick={() => navigate(`/projetos/${project.id}/form2`)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Projeto Vendido
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Alert for resubmitted project with changes */}
        {hasChanges && (user?.role === 'projetos' || user?.role === 'admin') && (
          <Alert className="mb-6 bg-amber-50 border-amber-400/50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-foreground">
              <strong>Projeto reenviado com alterações.</strong> Os campos destacados em amarelo foram modificados pelo vendedor.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* TAP Summary */}
            {tap && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do TAP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className={cn("rounded p-2", changedStyle('portaria_virtual_atendimento_app'))}>
                      <p className="text-xs text-muted-foreground uppercase">Portaria Virtual</p>
                      <p className="font-medium">{PORTARIA_VIRTUAL_LABELS[tap.portaria_virtual_atendimento_app]}</p>
                    </div>
                    <div className={cn("rounded p-2", changedStyle('numero_blocos'))}>
                      <p className="text-xs text-muted-foreground uppercase">Nº Blocos</p>
                      <p className="font-medium">{tap.numero_blocos}</p>
                    </div>
                    <div className={cn("rounded p-2", changedStyle('interfonia'))}>
                      <p className="text-xs text-muted-foreground uppercase">Interfonia</p>
                      <p className="font-medium">{tap.interfonia ? 'Sim' : 'Não'}</p>
                    </div>
                    <div className={cn("rounded p-2", changedStyle('cftv_elevador_possui'))}>
                      <p className="text-xs text-muted-foreground uppercase">CFTV Elevador</p>
                      <p className="font-medium">{CFTV_ELEVADOR_LABELS[tap.cftv_elevador_possui]}</p>
                    </div>
                    <div className={cn("rounded p-2", changedStyle('marcacao_croqui_confirmada'))}>
                      <p className="text-xs text-muted-foreground uppercase">Croqui Confirmado</p>
                      <p className="font-medium flex items-center gap-1">
                        {tap.marcacao_croqui_confirmada ? (
                          <><Check className="w-4 h-4 text-status-approved" /> Sim</>
                        ) : (
                          <><AlertTriangle className="w-4 h-4 text-status-pending" /> Não</>
                        )}
                      </p>
                    </div>
                  </div>

                  {tap.controle_acessos_pedestre_descricao && (
                    <div className={cn("rounded p-2", changedStyle('controle_acessos_pedestre_descricao'))}>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Controle Pedestre</p>
                      <p className="text-sm">{tap.controle_acessos_pedestre_descricao}</p>
                    </div>
                  )}

                  {tap.controle_acessos_veiculo_descricao && (
                    <div className={cn("rounded p-2", changedStyle('controle_acessos_veiculo_descricao'))}>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Controle Veículo</p>
                      <p className="text-sm">{tap.controle_acessos_veiculo_descricao}</p>
                    </div>
                  )}

                  {tap.alarme_descricao && (
                    <div className={cn("rounded p-2", changedStyle('alarme_descricao'))}>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Alarme</p>
                      <p className="text-sm">{tap.alarme_descricao}</p>
                    </div>
                  )}

                  {tap.cftv_dvr_descricao && (
                    <div className={cn("rounded p-2", changedStyle('cftv_dvr_descricao'))}>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Anexos do Vendedor</CardTitle>
                {canEdit && (
                  <div>
                    <input
                      id="file-upload-vendedor"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('file-upload-vendedor')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Adicionar Arquivos
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {project.attachments.filter(a => !['PLANTA_CROQUI_DEVOLUCAO', 'LISTA_EQUIPAMENTOS', 'LISTA_ATIVIDADES'].includes(a.tipo)).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum anexo</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.attachments.filter(a => !['PLANTA_CROQUI_DEVOLUCAO', 'LISTA_EQUIPAMENTOS', 'LISTA_ATIVIDADES'].includes(a.tipo)).map(att => (
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

            {/* Deliverables from Engineering - Section for projetista to upload and vendedor to view */}
            <EngineeringDeliverables 
              project={project}
              canChangeStatus={canChangeStatus}
              user={user}
              addAttachment={addAttachment}
              updateProject={updateProject}
            />

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
            {/* Engineering Timeline */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline Engenharia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EngineeringTimeline
                  currentStatus={project.engineering_status}
                  receivedAt={project.engineering_received_at}
                  productionAt={project.engineering_production_at}
                  completedAt={project.engineering_completed_at}
                />
                
                {canChangeStatus && project.engineering_status !== 'CONCLUIDO' && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <Select 
                      value={selectedEngineeringStatus} 
                      onValueChange={(v) => setSelectedEngineeringStatus(v as EngineeringStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alterar status engenharia" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENGINEERING_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem 
                            key={value} 
                            value={value} 
                            disabled={value === project.engineering_status}
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full" 
                      onClick={handleEngineeringStatusChange} 
                      disabled={!selectedEngineeringStatus}
                    >
                      Atualizar
                    </Button>
                  </div>
                )}

                {canMarkCompleted && (
                  <Button 
                    className="w-full mt-4 bg-status-approved hover:bg-status-approved/90"
                    onClick={handleMarkCompleted}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar Projeto Concluído
                  </Button>
                )}
              </CardContent>
            </Card>

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
                  <p className="text-muted-foreground">E-mail do Vendedor</p>
                  <p className="font-medium">{project.vendedor_email}</p>
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
                    <p className="text-muted-foreground">Data da Assembleia</p>
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

      {/* Dialog para Pendente Info */}
      <Dialog open={showPendingInfoDialog} onOpenChange={setShowPendingInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-pending" />
              Informação Pendente
            </DialogTitle>
            <DialogDescription>
              Informe ao vendedor quais informações estão faltando neste projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Descreva detalhadamente quais informações estão faltando..."
              value={pendingInfoReason}
              onChange={(e) => setPendingInfoReason(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-sm text-muted-foreground">
              Esta mensagem será enviada por email ao vendedor e adicionada como comentário no projeto.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPendingInfoDialog(false);
                setPendingInfoReason('');
                setSelectedStatus('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmPendingInfo}
              disabled={!pendingInfoReason.trim() || isSendingEmail}
              className="bg-status-pending hover:bg-status-pending/90"
            >
              {isSendingEmail ? 'Enviando...' : 'Confirmar e Notificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
