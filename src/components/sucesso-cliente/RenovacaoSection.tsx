import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RenovacaoSectionProps {
  customerId: string;
  dataAtivacao: string | null;
  dataTermino: string | null;
  mensalidade: number | null;
  onUpdate: () => void;
}

const formatBRL = (value: number | null) => {
  if (value == null) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function RenovacaoSection({ customerId, dataAtivacao, dataTermino, mensalidade, onUpdate }: RenovacaoSectionProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  const calculateTermino = () => {
    if (dataTermino) return parseISO(dataTermino);
    if (!dataAtivacao) return null;
    return addMonths(parseISO(dataAtivacao), 36);
  };

  const terminoDate = calculateTermino();
  const diasRestantes = terminoDate ? differenceInDays(terminoDate, new Date()) : null;

  const getStatusBadge = () => {
    if (diasRestantes === null) return <Badge variant="outline">Sem data</Badge>;
    if (diasRestantes < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diasRestantes <= 90) return <Badge variant="destructive">Vence em {diasRestantes} dias</Badge>;
    if (diasRestantes <= 180) return <Badge className="bg-yellow-500">Vence em {diasRestantes} dias</Badge>;
    return <Badge className="bg-green-500">Vigente ({diasRestantes} dias)</Badge>;
  };

  const handleAbrirChamado = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const userName = userData.user?.user_metadata?.nome || userData.user?.email || 'Sistema';

      const partes: string[] = [
        'Processo de Renovação Contratual iniciado.',
        `Data de Ativação: ${dataAtivacao ? format(parseISO(dataAtivacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}`,
        `Término do Contrato: ${terminoDate ? format(terminoDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}`,
        `Mensalidade Atual: ${mensalidade != null ? `R$ ${formatBRL(mensalidade)}` : '-'}`,
        `Status: ${diasRestantes === null ? 'Sem informação' : diasRestantes < 0 ? 'Contrato vencido' : `${diasRestantes} dias restantes`}`,
      ];
      if (observacoes.trim()) partes.push('', `Observações: ${observacoes.trim()}`);

      const { error } = await supabase.from('customer_chamados').insert({
        customer_id: customerId,
        assunto: 'Renovação Contratual',
        descricao: partes.join('\n'),
        prioridade: 'alta',
        status: 'aberto',
        created_by: userId,
        created_by_name: userName,
      });

      if (error) throw error;

      toast({ title: 'Chamado aberto', description: 'Chamado de Renovação Contratual criado com sucesso.' });
      setOpen(false);
      setObservacoes('');
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível abrir o chamado.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-amber-500" />
          Processo de Renovação
        </CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Data de Ativação
            </div>
            <p className="font-medium">
              {dataAtivacao ? format(parseISO(dataAtivacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Término do Contrato
            </div>
            <p className="font-medium">
              {terminoDate ? format(terminoDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Mensalidade Atual
            </div>
            <p className="font-medium">
              {mensalidade != null ? `R$ ${formatBRL(mensalidade)}` : '-'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {diasRestantes !== null && diasRestantes <= 90 ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              Status
            </div>
            <p className="font-medium">
              {diasRestantes !== null
                ? diasRestantes < 0
                  ? 'Contrato vencido'
                  : `${diasRestantes} dias restantes`
                : 'Sem informação'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={() => setOpen(true)} className="bg-amber-500 hover:bg-amber-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Iniciar Processo de Renovação
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Abrir Chamado - Renovação Contratual</DialogTitle>
              <DialogDescription>
                Um chamado será aberto para a equipe de Sucesso do Cliente com as informações atuais do contrato.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2 text-sm">
              <div>
                <p className="text-muted-foreground">Data de Ativação</p>
                <p className="font-medium">{dataAtivacao ? format(parseISO(dataAtivacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Término do Contrato</p>
                <p className="font-medium">{terminoDate ? format(terminoDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mensalidade Atual</p>
                <p className="font-medium">{mensalidade != null ? `R$ ${formatBRL(mensalidade)}` : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">
                  {diasRestantes !== null
                    ? diasRestantes < 0
                      ? 'Contrato vencido'
                      : `${diasRestantes} dias restantes`
                    : 'Sem informação'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações / Comentários</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione detalhes, condições propostas, contexto do cliente..."
                rows={5}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleAbrirChamado} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                {saving ? 'Abrindo...' : 'Abrir Chamado'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
