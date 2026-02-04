import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RenovacaoSectionProps {
  customerId: string;
  dataAtivacao: string | null;
  dataTermino: string | null;
  onUpdate: () => void;
}

export function RenovacaoSection({ customerId, dataAtivacao, dataTermino, onUpdate }: RenovacaoSectionProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novaDataTermino, setNovaDataTermino] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const calculateTermino = () => {
    if (dataTermino) return parseISO(dataTermino);
    if (!dataAtivacao) return null;
    return addMonths(parseISO(dataAtivacao), 36);
  };

  const terminoDate = calculateTermino();
  const diasRestantes = terminoDate ? differenceInDays(terminoDate, new Date()) : null;

  const getStatusBadge = () => {
    if (!diasRestantes) return <Badge variant="outline">Sem data</Badge>;
    if (diasRestantes < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diasRestantes <= 90) return <Badge variant="destructive">Vence em {diasRestantes} dias</Badge>;
    if (diasRestantes <= 180) return <Badge className="bg-yellow-500">Vence em {diasRestantes} dias</Badge>;
    return <Badge className="bg-green-500">Vigente ({diasRestantes} dias)</Badge>;
  };

  const handleRenovar = async () => {
    if (!novaDataTermino) {
      toast({ title: 'Erro', description: 'Informe a nova data de término.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_portfolio')
        .update({ data_termino: novaDataTermino })
        .eq('id', customerId);

      if (error) throw error;
      
      toast({ title: 'Contrato renovado', description: 'A data de término foi atualizada com sucesso.' });
      setEditing(false);
      setNovaDataTermino('');
      setObservacoes('');
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível renovar o contrato.', variant: 'destructive' });
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status atual */}
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
              {diasRestantes && diasRestantes <= 90 ? (
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

        {/* Renovação */}
        {editing ? (
          <div className="mt-6 p-4 border rounded-lg space-y-4">
            <h4 className="font-medium">Renovar Contrato</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nova Data de Término</Label>
                <Input
                  type="date"
                  value={novaDataTermino}
                  onChange={(e) => setNovaDataTermino(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre a renovação..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleRenovar} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Renovação'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <Button onClick={() => setEditing(true)} className="bg-amber-500 hover:bg-amber-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Iniciar Processo de Renovação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
