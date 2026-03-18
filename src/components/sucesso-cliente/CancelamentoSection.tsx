import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { XCircle, Calendar, Truck, DollarSign, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MOTIVOS = [
  'Concorrência',
  'Retrocedeu a tecnologia',
  'Insatisfação com serviço prestado',
  'Preço',
];

interface CancelamentoSectionProps {
  customerId: string;
  mensalidade: number | null;
  onUpdate: () => void;
}

interface Cancelamento {
  id: string;
  data_cancelamento: string;
  data_visita_retirada: string | null;
  valor_contrato: number | null;
  motivo: string;
  observacoes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export function CancelamentoSection({ customerId, mensalidade, onUpdate }: CancelamentoSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelamento, setCancelamento] = useState<Cancelamento | null>(null);
  const [loading, setLoading] = useState(true);

  const [dataCancelamento, setDataCancelamento] = useState('');
  const [dataVisitaRetirada, setDataVisitaRetirada] = useState('');
  const [valorContrato, setValorContrato] = useState(mensalidade?.toString() || '');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const fetchCancelamento = async () => {
    const { data } = await supabase
      .from('customer_cancelamentos' as any)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && (data as any[]).length > 0) {
      setCancelamento((data as any[])[0] as Cancelamento);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCancelamento();
  }, [customerId]);

  const handleSalvar = async () => {
    if (!dataCancelamento || !motivo) {
      toast({ title: 'Erro', description: 'Informe a data de cancelamento e o motivo.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_cancelamentos' as any)
        .insert({
          customer_id: customerId,
          data_cancelamento: dataCancelamento,
          data_visita_retirada: dataVisitaRetirada || null,
          valor_contrato: valorContrato ? parseFloat(valorContrato) : 0,
          motivo,
          observacoes: observacoes || null,
          created_by: user?.id,
          created_by_name: user?.nome,
        } as any);

      if (error) throw error;

      toast({ title: 'Cancelamento registrado', description: 'O processo de cancelamento foi registrado com sucesso.' });
      setEditing(false);
      resetForm();
      fetchCancelamento();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível registrar o cancelamento.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDataCancelamento('');
    setDataVisitaRetirada('');
    setValorContrato(mensalidade?.toString() || '');
    setMotivo('');
    setObservacoes('');
  };

  const getMotivoBadgeColor = (m: string) => {
    switch (m) {
      case 'Concorrência': return 'bg-orange-500';
      case 'Retrocedeu a tecnologia': return 'bg-blue-500';
      case 'Insatisfação com serviço prestado': return 'bg-red-500';
      case 'Preço': return 'bg-yellow-500';
      default: return 'bg-muted';
    }
  };

  if (loading) return null;

  // Already has a cancellation registered
  if (cancelamento) {
    return (
      <Card className="border-destructive/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Processo de Cancelamento
          </CardTitle>
          <Badge variant="destructive">Cancelado</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Data de Cancelamento
              </div>
              <p className="font-medium">
                {format(parseISO(cancelamento.data_cancelamento), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" />
                Visita de Retirada
              </div>
              <p className="font-medium">
                {cancelamento.data_visita_retirada
                  ? format(parseISO(cancelamento.data_visita_retirada), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Não agendada'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                Valor do Contrato
              </div>
              <p className="font-medium">
                {cancelamento.valor_contrato
                  ? `R$ ${Number(cancelamento.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : '-'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                Motivo
              </div>
              <Badge className={getMotivoBadgeColor(cancelamento.motivo)}>
                {cancelamento.motivo}
              </Badge>
            </div>
          </div>

          {cancelamento.observacoes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground font-medium mb-1">Observações</p>
              <p className="text-sm">{cancelamento.observacoes}</p>
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Registrado por {cancelamento.created_by_name || 'Sistema'} em{' '}
            {format(parseISO(cancelamento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No cancellation yet
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-destructive" />
          Processo de Cancelamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-medium">Registrar Cancelamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Data de Cancelamento *</Label>
                <Input
                  type="date"
                  value={dataCancelamento}
                  onChange={(e) => setDataCancelamento(e.target.value)}
                />
              </div>
              <div>
                <Label>Data da Visita de Retirada</Label>
                <Input
                  type="date"
                  value={dataVisitaRetirada}
                  onChange={(e) => setDataVisitaRetirada(e.target.value)}
                />
              </div>
              <div>
                <Label>Valor do Contrato Cancelado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorContrato}
                  onChange={(e) => setValorContrato(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Motivo *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes sobre o cancelamento..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditing(false); resetForm(); }}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleSalvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => setEditing(true)}>
            <XCircle className="w-4 h-4 mr-2" />
            Iniciar Processo de Cancelamento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
