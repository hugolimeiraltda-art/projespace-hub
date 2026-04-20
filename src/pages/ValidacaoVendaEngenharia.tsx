import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SaleValidation {
  id: string;
  project_id: string;
  submitted_by_name: string | null;
  submitted_at: string;
  mesmo_projeto: boolean;
  alteracoes: string | null;
  justificativa_alteracoes: string | null;
  validation_status: string;
}

export default function ValidacaoVendaEngenharia() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, projects, submitSaleForm } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<ReturnType<typeof getProject>>(undefined);
  const [validation, setValidation] = useState<SaleValidation | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProject(getProject(id!));
  }, [id, projects, getProject]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('sale_validations')
        .select('*')
        .eq('project_id', id)
        .eq('validation_status', 'PENDENTE')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setValidation(data as SaleValidation | null);
      setIsLoading(false);
    })();
  }, [id]);

  const canValidate = user?.role === 'projetos' || user?.role === 'admin';

  const handleDecision = async (approved: boolean) => {
    if (!validation || !project) return;
    setIsProcessing(true);
    try {
      await supabase
        .from('sale_validations')
        .update({
          validation_status: approved ? 'APROVADA' : 'REPROVADA',
          validated_by: user?.id,
          validated_by_name: user?.nome,
          validated_at: new Date().toISOString(),
          engenharia_observacoes: observacoes || null,
        })
        .eq('id', validation.id);

      if (approved) {
        await submitSaleForm(project.id);
        await supabase.from('project_notifications').insert({
          project_id: project.id,
          type: 'SALE_VALIDATION_APPROVED',
          title: 'Venda aprovada pela engenharia',
          message: `Sua venda do projeto "${project.cliente_condominio_nome}" foi aprovada e enviada para implantação.`,
          read: false,
          for_user_id: project.created_by_user_id,
        });
      } else {
        await supabase.from('projects').update({ sale_status: 'EM_ANDAMENTO' }).eq('id', project.id);
        await supabase.from('project_notifications').insert({
          project_id: project.id,
          type: 'SALE_VALIDATION_REJECTED',
          title: 'Venda reprovada pela engenharia',
          message: `Sua venda do projeto "${project.cliente_condominio_nome}" foi reprovada. Motivo: ${observacoes || 'Não informado'}`,
          read: false,
          for_user_id: project.created_by_user_id,
        });
      }

      try {
        await supabase.functions.invoke('send-status-email', {
          body: {
            to_user_id: project.created_by_user_id,
            subject: `Venda ${approved ? 'aprovada' : 'reprovada'} - ${project.cliente_condominio_nome}`,
            message: `A engenharia ${approved ? 'aprovou' : 'reprovou'} a venda do projeto "${project.cliente_condominio_nome}".${observacoes ? `\n\nObservações: ${observacoes}` : ''}`,
          },
        });
      } catch (e) { console.warn('Email not sent:', e); }

      toast({ title: approved ? 'Venda aprovada!' : 'Venda reprovada', description: approved ? 'O projeto foi enviado para implantação.' : 'O vendedor foi notificado.' });
      navigate(`/projetos/${project.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível processar.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !project) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Carregando...</div></Layout>;
  }

  if (!canValidate) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Apenas a equipe de engenharia pode validar vendas.</div></Layout>;
  }

  if (!validation) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => navigate(`/projetos/${project.id}`)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
          <Alert><AlertDescription>Não há validação pendente para este projeto.</AlertDescription></Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/projetos/${project.id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Projeto
        </Button>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Validação de Venda</h1>
          <p className="text-muted-foreground">{project.cliente_condominio_nome}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revisão enviada pelo vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> {validation.submitted_by_name}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(parseISO(validation.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>

            <div>
              <Label>O projeto vendido foi o mesmo projetado?</Label>
              <div className="mt-2">
                {validation.mesmo_projeto ? (
                  <Badge className="bg-status-approved">Sim — sem alterações</Badge>
                ) : (
                  <Badge variant="destructive">Não — com alterações</Badge>
                )}
              </div>
            </div>

            {!validation.mesmo_projeto && (
              <>
                <div>
                  <Label>Alterações declaradas</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{validation.alteracoes}</div>
                </div>
                <div>
                  <Label>Justificativa</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{validation.justificativa_alteracoes}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Decisão da Engenharia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="obs">Observações (opcional para aprovar, obrigatório para reprovar)</Label>
              <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} className="mt-1" placeholder="Ex: alteração aprovada, documentação atualizada..." />
            </div>
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>Ao aprovar, o projeto segue automaticamente para a equipe de implantação.</AlertDescription>
            </Alert>
            <div className="flex flex-col md:flex-row gap-2 justify-end">
              <Button variant="destructive" onClick={() => handleDecision(false)} disabled={isProcessing || !observacoes.trim()}>
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} Reprovar
              </Button>
              <Button onClick={() => handleDecision(true)} disabled={isProcessing} className="bg-status-approved hover:bg-status-approved/90">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Aprovar e Enviar para Implantação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
