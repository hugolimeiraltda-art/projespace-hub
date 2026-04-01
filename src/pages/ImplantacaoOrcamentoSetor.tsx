import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DollarSign, Plus, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface OrcamentoItem {
  id: string;
  ano: number;
  mes: number;
  categoria: string;
  valor_planejado: number;
  valor_executado: number;
  observacoes: string | null;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CATEGORIAS_DEFAULT = [
  'Mão de Obra Instalação',
  'Material / Equipamentos',
  'Deslocamento / Pedágio',
  'Diárias',
  'Infraestrutura',
  'Serralheria',
  'Vidraçaria',
  'Outros',
];

export default function ImplantacaoOrcamentoSetor() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [items, setItems] = useState<OrcamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' });

  useEffect(() => { fetchData(); }, [ano]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('implantacao_orcamento_setor')
      .select('*')
      .eq('ano', ano)
      .order('mes')
      .order('categoria');
    if (data) setItems(data as any);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.mes || !form.categoria) { toast.error('Mês e categoria são obrigatórios.'); return; }
    setSaving(true);
    try {
      const payload = {
        ano,
        mes: parseInt(form.mes),
        categoria: form.categoria,
        valor_planejado: parseFloat(form.valor_planejado) || 0,
        valor_executado: parseFloat(form.valor_executado) || 0,
        observacoes: form.observacoes || null,
        updated_at: new Date().toISOString(),
        created_by: user?.id,
        created_by_name: user?.nome,
      };

      // Upsert by ano+mes+categoria
      const existing = items.find(i => i.mes === payload.mes && i.categoria === payload.categoria);
      if (existing) {
        const { error } = await supabase.from('implantacao_orcamento_setor').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('implantacao_orcamento_setor').insert(payload);
        if (error) throw error;
      }
      toast.success('Orçamento salvo.');
      setDialogOpen(false);
      setForm({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' });
      fetchData();
    } catch {
      toast.error('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item: OrcamentoItem) => {
    setForm({
      mes: item.mes.toString(),
      categoria: item.categoria,
      valor_planejado: item.valor_planejado.toString(),
      valor_executado: item.valor_executado.toString(),
      observacoes: item.observacoes || '',
    });
    setDialogOpen(true);
  };

  // Aggregations
  const totalPlanejado = items.reduce((s, i) => s + Number(i.valor_planejado), 0);
  const totalExecutado = items.reduce((s, i) => s + Number(i.valor_executado), 0);
  const pctExec = totalPlanejado > 0 ? Math.round((totalExecutado / totalPlanejado) * 100) : 0;

  // Chart: monthly totals
  const chartData = useMemo(() => {
    return MESES.map((label, idx) => {
      const mes = idx + 1;
      const mesItems = items.filter(i => i.mes === mes);
      return {
        mes: label,
        planejado: mesItems.reduce((s, i) => s + Number(i.valor_planejado), 0),
        executado: mesItems.reduce((s, i) => s + Number(i.valor_executado), 0),
      };
    });
  }, [items]);

  // Category summary
  const categorySummary = useMemo(() => {
    const map: Record<string, { planejado: number; executado: number }> = {};
    items.forEach(i => {
      if (!map[i.categoria]) map[i.categoria] = { planejado: 0, executado: 0 };
      map[i.categoria].planejado += Number(i.valor_planejado);
      map[i.categoria].executado += Number(i.valor_executado);
    });
    return Object.entries(map).map(([cat, vals]) => ({ categoria: cat, ...vals })).sort((a, b) => b.planejado - a.planejado);
  }, [items]);

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              Orçamento do Setor
            </h1>
            <p className="text-muted-foreground text-sm">Planejado vs Executado — Implantação</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={ano.toString()} onValueChange={v => setAno(parseInt(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setForm({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' }); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Lançar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Planejado</p>
              <p className="text-xl font-bold">{fmtBRL(totalPlanejado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Executado</p>
              <p className={`text-xl font-bold ${totalExecutado > totalPlanejado ? 'text-destructive' : 'text-chart-2'}`}>
                {fmtBRL(totalExecutado)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">% Execução</p>
              <p className={`text-xl font-bold ${pctExec > 100 ? 'text-destructive' : ''}`}>{pctExec}%</p>
              <Progress value={Math.min(pctExec, 100)} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo Mensal — {ano}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="planejado" name="Planejado" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="executado" name="Executado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Summary */}
        {categorySummary.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Planejado</TableHead>
                    <TableHead className="text-right">Executado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySummary.map(c => {
                    const saldo = c.planejado - c.executado;
                    const pct = c.planejado > 0 ? Math.round((c.executado / c.planejado) * 100) : 0;
                    return (
                      <TableRow key={c.categoria}>
                        <TableCell className="font-medium text-sm">{c.categoria}</TableCell>
                        <TableCell className="text-sm text-right">{fmtBRL(c.planejado)}</TableCell>
                        <TableCell className="text-sm text-right">{fmtBRL(c.executado)}</TableCell>
                        <TableCell className={`text-sm text-right font-medium ${saldo < 0 ? 'text-destructive' : 'text-chart-2'}`}>
                          {fmtBRL(saldo)}
                        </TableCell>
                        <TableCell className={`text-sm text-right font-medium ${pct > 100 ? 'text-destructive' : ''}`}>{pct}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Monthly detail table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lançamentos Detalhados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Executado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lançamento para {ano}</TableCell></TableRow>
                ) : items.map(item => {
                  const saldo = Number(item.valor_planejado) - Number(item.valor_executado);
                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => editItem(item)}>
                      <TableCell className="text-sm font-medium">{MESES[item.mes - 1]}</TableCell>
                      <TableCell className="text-sm">{item.categoria}</TableCell>
                      <TableCell className="text-sm text-right">{fmtBRL(Number(item.valor_planejado))}</TableCell>
                      <TableCell className="text-sm text-right">{fmtBRL(Number(item.valor_executado))}</TableCell>
                      <TableCell className={`text-sm text-right font-medium ${saldo < 0 ? 'text-destructive' : 'text-chart-2'}`}>
                        {fmtBRL(saldo)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.observacoes || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Lançar Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mês *</Label>
                  <Select value={form.mes} onValueChange={v => setForm(f => ({ ...f, mes: v }))}>
                    <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_DEFAULT.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Planejado (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_planejado} onChange={e => setForm(f => ({ ...f, valor_planejado: e.target.value }))} />
                </div>
                <div>
                  <Label>Valor Executado (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_executado} onChange={e => setForm(f => ({ ...f, valor_executado: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
