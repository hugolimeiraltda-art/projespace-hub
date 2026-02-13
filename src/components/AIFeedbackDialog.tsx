import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Star } from 'lucide-react';

interface AIFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
  userName: string;
  type: 'engineering' | 'implantacao';
  onSubmitted: () => void;
}

export function AIFeedbackDialog({
  open,
  onOpenChange,
  projectId,
  userId,
  userName,
  type,
  onSubmitted,
}: AIFeedbackDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);
  const [summaryPreview, setSummaryPreview] = useState('');

  // Engineering fields
  const [adequado, setAdequado] = useState<string>('');
  const [pontosAjuste, setPontosAjuste] = useState('');
  const [notaPrecisao, setNotaPrecisao] = useState<number>(0);

  // Implantacao fields
  const [bateuRealidade, setBateuRealidade] = useState<string>('');
  const [divergencias, setDivergencias] = useState('');
  const [sugestoes, setSugestoes] = useState('');
  const [notaImpl, setNotaImpl] = useState<number>(0);

  useEffect(() => {
    if (!open || !projectId) return;
    const loadSummary = async () => {
      const tipo = type === 'engineering' ? 'projeto' : 'implantacao';
      // Try the specific type first, then fall back to 'projeto'
      let { data } = await supabase
        .from('project_ai_summaries')
        .select('resumo_gerado')
        .eq('project_id', projectId)
        .eq('tipo', tipo)
        .maybeSingle();

      if (!data && tipo === 'implantacao') {
        const res = await supabase
          .from('project_ai_summaries')
          .select('resumo_gerado')
          .eq('project_id', projectId)
          .eq('tipo', 'projeto')
          .maybeSingle();
        data = res.data;
      }

      if (data?.resumo_gerado) {
        setHasSummary(true);
        setSummaryPreview(data.resumo_gerado.substring(0, 300) + (data.resumo_gerado.length > 300 ? '...' : ''));
      } else {
        setHasSummary(false);
      }
    };
    loadSummary();
  }, [open, projectId, type]);

  const handleSubmit = async () => {
    if (type === 'engineering' && !adequado) {
      toast({ title: 'Preencha o campo obrigatório', description: 'Informe se o resumo da IA estava adequado.', variant: 'destructive' });
      return;
    }
    if (type === 'implantacao' && !bateuRealidade) {
      toast({ title: 'Preencha o campo obrigatório', description: 'Informe se o projeto bateu com a realidade.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tipo = type === 'engineering' ? 'projeto' : 'implantacao';

      // Check if summary record exists
      const { data: existing } = await supabase
        .from('project_ai_summaries')
        .select('id')
        .eq('project_id', projectId)
        .eq('tipo', tipo)
        .maybeSingle();

      if (type === 'engineering') {
        const feedbackData = {
          eng_resumo_adequado: adequado === 'sim',
          eng_pontos_ajuste: pontosAjuste || null,
          eng_nota_precisao: notaPrecisao || null,
          eng_feedback_by: userId,
          eng_feedback_by_name: userName,
          eng_feedback_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from('project_ai_summaries').update(feedbackData).eq('id', existing.id);
        } else {
          await supabase.from('project_ai_summaries').insert({
            project_id: projectId,
            tipo,
            resumo_gerado: '(Resumo não gerado - apenas feedback)',
            ...feedbackData,
          });
        }
      } else {
        const feedbackData = {
          impl_projeto_bateu_realidade: bateuRealidade === 'sim',
          impl_divergencias: divergencias || null,
          impl_sugestoes_melhoria: sugestoes || null,
          impl_nota_precisao: notaImpl || null,
          impl_feedback_by: userId,
          impl_feedback_by_name: userName,
          impl_feedback_at: new Date().toISOString(),
        };

        // For implantacao, try updating the 'projeto' type summary if specific doesn't exist
        if (existing) {
          await supabase.from('project_ai_summaries').update(feedbackData).eq('id', existing.id);
        } else {
          // Try the 'projeto' type
          const { data: projSummary } = await supabase
            .from('project_ai_summaries')
            .select('id')
            .eq('project_id', projectId)
            .eq('tipo', 'projeto')
            .maybeSingle();

          if (projSummary) {
            await supabase.from('project_ai_summaries').update(feedbackData).eq('id', projSummary.id);
          } else {
            await supabase.from('project_ai_summaries').insert({
              project_id: projectId,
              tipo,
              resumo_gerado: '(Resumo não gerado - apenas feedback)',
              ...feedbackData,
            });
          }
        }
      }

      toast({ title: 'Feedback registrado!', description: 'Obrigado! Suas informações serão usadas para melhorar os resumos futuros.' });
      onSubmitted();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving AI feedback:', err);
      toast({ title: 'Erro', description: 'Não foi possível salvar o feedback.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`w-6 h-6 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {type === 'engineering' ? 'Feedback do Resumo IA' : 'Avaliação do Projeto vs Realidade'}
          </DialogTitle>
          <DialogDescription>
            {type === 'engineering'
              ? 'Antes de concluir, avalie se o resumo gerado pela IA estava adequado. Essas informações ajudarão a melhorar os próximos resumos.'
              : 'Avalie se o projeto da engenharia correspondeu à realidade encontrada na implantação. Seus dados serão usados para aprendizado de máquina.'}
          </DialogDescription>
        </DialogHeader>

        {hasSummary && summaryPreview && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground border">
            <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wide">Trecho do resumo IA:</p>
            <p className="line-clamp-4">{summaryPreview}</p>
          </div>
        )}

        {!hasSummary && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground text-center">
            Nenhum resumo de IA foi gerado para este projeto. Você ainda pode fornecer feedback geral.
          </div>
        )}

        <div className="space-y-4 py-2">
          {type === 'engineering' ? (
            <>
              <div className="space-y-2">
                <Label className="font-medium">O resumo da IA estava adequado? *</Label>
                <RadioGroup value={adequado} onValueChange={setAdequado} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="eng-sim" />
                    <Label htmlFor="eng-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcialmente" id="eng-parcial" />
                    <Label htmlFor="eng-parcial">Parcialmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="eng-nao" />
                    <Label htmlFor="eng-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Quais pontos precisam ser ajustados?</Label>
                <Textarea
                  value={pontosAjuste}
                  onChange={e => setPontosAjuste(e.target.value)}
                  placeholder="Descreva itens faltantes, incorretos ou que precisam de mais detalhes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Nota de precisão do resumo (1-5)</Label>
                <StarRating value={notaPrecisao} onChange={setNotaPrecisao} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="font-medium">O projeto da engenharia correspondeu à realidade do cliente? *</Label>
                <RadioGroup value={bateuRealidade} onValueChange={setBateuRealidade} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="impl-sim" />
                    <Label htmlFor="impl-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcialmente" id="impl-parcial" />
                    <Label htmlFor="impl-parcial">Parcialmente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="impl-nao" />
                    <Label htmlFor="impl-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Quais divergências foram encontradas?</Label>
                <Textarea
                  value={divergencias}
                  onChange={e => setDivergencias(e.target.value)}
                  placeholder="Descreva diferenças entre o projeto e a realidade encontrada no local..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Sugestões de melhoria para próximos projetos</Label>
                <Textarea
                  value={sugestoes}
                  onChange={e => setSugestoes(e.target.value)}
                  placeholder="O que poderia ser melhorado no levantamento ou no resumo da IA..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Nota de precisão geral (1-5)</Label>
                <StarRating value={notaImpl} onChange={setNotaImpl} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Enviar Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
