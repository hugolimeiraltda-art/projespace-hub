import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlanData {
  id: string;
  mes: number;
  ano: number;
  qtd_contratos: number;
  valor_total: number;
  praca: string;
  ticket_medio: number;
}

interface Props {
  onUpdate: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PRACAS = ['GERAL', 'BHZ', 'RIO', 'VIX', 'SPO'];

export function PlanejamentoAtivacoes({ onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [praca, setPraca] = useState('GERAL');
  const [qtd, setQtd] = useState('');
  
  const [ticketMedio, setTicketMedio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchPlans();
  }, [open]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('implantacao_planejamento_ativacoes')
      .select('*')
      .order('ano', { ascending: true })
      .order('mes', { ascending: true });
    if (data) setPlans(data as PlanData[]);
  };

  const parseNumber = (val: string) => {
    const cleaned = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return Number(cleaned) || 0;
  };

  const handleAdd = async () => {
    if (!qtd || !ticketMedio) {
      toast.error('Preencha quantidade e ticket médio');
      return;
    }
    const ticketNum = parseNumber(ticketMedio);
    const qtdNum = parseNumber(qtd);
    const valorTotal = qtdNum * ticketNum;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', userData.user?.id || '')
      .single();

    const { error } = await supabase
      .from('implantacao_planejamento_ativacoes')
      .upsert({
        mes: Number(mes),
        ano: Number(ano),
        praca,
        qtd_contratos: qtdNum,
        valor_total: valorTotal,
        ticket_medio: ticketNum,
        created_by: userData.user?.id,
        created_by_name: profile?.nome || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'mes,ano,praca' });

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Planejamento salvo');
      setQtd('');
      
      setTicketMedio('');
      fetchPlans();
      onUpdate();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('implantacao_planejamento_ativacoes')
      .delete()
      .eq('id', id);
    if (!error) {
      fetchPlans();
      onUpdate();
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Planejamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Planejamento de Ativações</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Mês</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Praça</Label>
              <Select value={praca} onValueChange={setPraca}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRACAS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Qtd Contratos</Label>
              <Input value={qtd} onChange={e => setQtd(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0" />
            </div>
            <div>
              <Label>Ticket Médio (R$)</Label>
              <Input value={ticketMedio} onChange={e => setTicketMedio(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Valor Total (R$)</Label>
              <Input
                value={
                  qtd && ticketMedio
                    ? `R$ ${(Math.round(parseNumber(qtd)) * parseNumber(ticketMedio)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'R$ 0,00'
                }
                readOnly
                className="bg-muted cursor-not-allowed"
                placeholder="0,00"
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Salvar Planejamento
          </Button>

          {plans.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Praça</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{MESES[p.mes - 1]}/{p.ano}</TableCell>
                      <TableCell className="text-sm">{p.praca || 'GERAL'}</TableCell>
                      <TableCell className="text-right text-sm">{p.qtd_contratos}</TableCell>
                      <TableCell className="text-right text-sm">R$ {Number(p.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-sm">R$ {Number(p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}