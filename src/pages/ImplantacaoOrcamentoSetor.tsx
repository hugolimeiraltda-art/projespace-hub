import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DollarSign, Plus, BarChart3, TrendingUp, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Despesas types & constants ──
interface OrcamentoItem {
  id: string;
  ano: number;
  mes: number;
  categoria: string;
  valor_planejado: number;
  valor_executado: number;
  observacoes: string | null;
}

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

// ── Receitas types ──
interface ReceitaItem {
  id: string;
  ano: number;
  mes: number;
  praca: string | null;
  qtd_contratos: number;
  qtd_churn: number | null;
  ticket_medio: number | null;
  valor_venda: number | null;
  valor_total: number;
}

const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ImplantacaoOrcamentoSetor() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [tab, setTab] = useState('receitas');

  // ── Despesas state ──
  const [despItems, setDespItems] = useState<OrcamentoItem[]>([]);
  const [despLoading, setDespLoading] = useState(true);
  const [despDialogOpen, setDespDialogOpen] = useState(false);
  const [despSaving, setDespSaving] = useState(false);
  const [despForm, setDespForm] = useState({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' });

  // ── Receitas state ──
  const [recItems, setRecItems] = useState<ReceitaItem[]>([]);
  const [recLoading, setRecLoading] = useState(true);

  useEffect(() => { fetchDespesas(); fetchReceitas(); }, [ano]);

  const fetchDespesas = async () => {
    setDespLoading(true);
    const { data } = await supabase
      .from('implantacao_orcamento_setor')
      .select('*')
      .eq('ano', ano)
      .order('mes')
      .order('categoria');
    if (data) setDespItems(data as any);
    setDespLoading(false);
  };

  const fetchReceitas = async () => {
    setRecLoading(true);
    const { data } = await supabase
      .from('implantacao_planejamento_ativacoes')
      .select('*')
      .eq('ano', ano)
      .order('mes')
      .order('praca');
    if (data) setRecItems(data as any);
    setRecLoading(false);
  };

  // ── Despesas handlers ──
  const handleDespSave = async () => {
    if (!despForm.mes || !despForm.categoria) { toast.error('Mês e categoria são obrigatórios.'); return; }
    setDespSaving(true);
    try {
      const payload = {
        ano,
        mes: parseInt(despForm.mes),
        categoria: despForm.categoria,
        valor_planejado: parseFloat(despForm.valor_planejado) || 0,
        valor_executado: parseFloat(despForm.valor_executado) || 0,
        observacoes: despForm.observacoes || null,
        updated_at: new Date().toISOString(),
        created_by: user?.id,
        created_by_name: user?.nome,
      };
      const existing = despItems.find(i => i.mes === payload.mes && i.categoria === payload.categoria);
      if (existing) {
        const { error } = await supabase.from('implantacao_orcamento_setor').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('implantacao_orcamento_setor').insert(payload);
        if (error) throw error;
      }
      toast.success('Despesa salva.');
      setDespDialogOpen(false);
      setDespForm({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' });
      fetchDespesas();
    } catch {
      toast.error('Erro ao salvar despesa.');
    } finally {
      setDespSaving(false);
    }
  };

  const editDespItem = (item: OrcamentoItem) => {
    setDespForm({
      mes: item.mes.toString(),
      categoria: item.categoria,
      valor_planejado: item.valor_planejado.toString(),
      valor_executado: item.valor_executado.toString(),
      observacoes: item.observacoes || '',
    });
    setDespDialogOpen(true);
  };

  // ── Despesas aggregations ──
  const despTotalPlanejado = despItems.reduce((s, i) => s + Number(i.valor_planejado), 0);
  const despTotalExecutado = despItems.reduce((s, i) => s + Number(i.valor_executado), 0);
  const despPctExec = despTotalPlanejado > 0 ? Math.round((despTotalExecutado / despTotalPlanejado) * 100) : 0;

  const despChartData = useMemo(() => {
    return MESES.map((label, idx) => {
      const mes = idx + 1;
      const mesItems = despItems.filter(i => i.mes === mes);
      return {
        mes: label,
        planejado: mesItems.reduce((s, i) => s + Number(i.valor_planejado), 0),
        executado: mesItems.reduce((s, i) => s + Number(i.valor_executado), 0),
      };
    });
  }, [despItems]);

  const categorySummary = useMemo(() => {
    const map: Record<string, { planejado: number; executado: number }> = {};
    despItems.forEach(i => {
      if (!map[i.categoria]) map[i.categoria] = { planejado: 0, executado: 0 };
      map[i.categoria].planejado += Number(i.valor_planejado);
      map[i.categoria].executado += Number(i.valor_executado);
    });
    return Object.entries(map).map(([cat, vals]) => ({ categoria: cat, ...vals })).sort((a, b) => b.planejado - a.planejado);
  }, [despItems]);

  // ── Receitas aggregations ──
  const recTotalReceita = recItems.reduce((s, i) => s + Number(i.valor_total), 0);
  const recTotalVenda = recItems.reduce((s, i) => s + Number(i.valor_venda || 0), 0);
  const recTotalAtivacoes = recItems.reduce((s, i) => s + Number(i.qtd_contratos), 0);
  const recTotalChurn = recItems.reduce((s, i) => s + Number(i.qtd_churn || 0), 0);

  const recChartData = useMemo(() => {
    return MESES.map((label, idx) => {
      const mes = idx + 1;
      const mesItems = recItems.filter(i => i.mes === mes);
      return {
        mes: label,
        receita: mesItems.reduce((s, i) => s + Number(i.valor_total), 0),
        venda: mesItems.reduce((s, i) => s + Number(i.valor_venda || 0), 0),
      };
    });
  }, [recItems]);

  const recPracaSummary = useMemo(() => {
    const map: Record<string, { ativacoes: number; churn: number; receita: number; venda: number }> = {};
    recItems.forEach(i => {
      const key = i.praca || 'GERAL';
      if (!map[key]) map[key] = { ativacoes: 0, churn: 0, receita: 0, venda: 0 };
      map[key].ativacoes += Number(i.qtd_contratos);
      map[key].churn += Number(i.qtd_churn || 0);
      map[key].receita += Number(i.valor_total);
      map[key].venda += Number(i.valor_venda || 0);
    });
    return Object.entries(map).map(([praca, vals]) => ({ praca, ...vals })).sort((a, b) => b.receita - a.receita);
  }, [recItems]);

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              Orçamento do Setor
            </h1>
            <p className="text-muted-foreground text-sm">Receitas e Despesas — Implantação</p>
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
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="receitas" className="gap-2"><TrendingUp className="w-4 h-4" /> Receitas</TabsTrigger>
            <TabsTrigger value="despesas" className="gap-2"><Wallet className="w-4 h-4" /> Despesas</TabsTrigger>
          </TabsList>

          {/* ════════ RECEITAS ════════ */}
          <TabsContent value="receitas" className="space-y-6 mt-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Receita Planejada</p>
                  <p className="text-xl font-bold">{fmtBRL(recTotalReceita)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Valor Venda (Tx Instalação)</p>
                  <p className="text-xl font-bold">{fmtBRL(recTotalVenda)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Ativações</p>
                  <p className="text-xl font-bold">{recTotalAtivacoes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Churn</p>
                  <p className={`text-xl font-bold ${recTotalChurn > 0 ? 'text-destructive' : ''}`}>{recTotalChurn}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Receita Mensal Planejada — {ano}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={recChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    <Bar dataKey="receita" name="Receita Mensal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="venda" name="Valor Venda" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resumo por Praça */}
            {recPracaSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumo por Praça</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Praça</TableHead>
                        <TableHead className="text-right">Ativações</TableHead>
                        <TableHead className="text-right">Churn</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Valor Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recPracaSummary.map(r => {
                        const saldo = r.ativacoes - r.churn;
                        return (
                          <TableRow key={r.praca}>
                            <TableCell className="font-medium text-sm">{r.praca}</TableCell>
                            <TableCell className="text-sm text-right">{r.ativacoes}</TableCell>
                            <TableCell className="text-sm text-right text-destructive">{r.churn}</TableCell>
                            <TableCell className={`text-sm text-right font-medium ${saldo < 0 ? 'text-destructive' : ''}`}>{saldo}</TableCell>
                            <TableCell className="text-sm text-right">{fmtBRL(r.receita)}</TableCell>
                            <TableCell className="text-sm text-right">{fmtBRL(r.venda)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Detail table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Praça</TableHead>
                      <TableHead className="text-right">Ativações</TableHead>
                      <TableHead className="text-right">Churn</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : recItems.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum planejamento para {ano}</TableCell></TableRow>
                    ) : recItems.map(item => {
                      const saldo = Number(item.qtd_contratos) - Number(item.qtd_churn || 0);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">{MESES[item.mes - 1]}</TableCell>
                          <TableCell className="text-sm">{item.praca || 'GERAL'}</TableCell>
                          <TableCell className="text-sm text-right">{item.qtd_contratos}</TableCell>
                          <TableCell className="text-sm text-right text-destructive">{item.qtd_churn || 0}</TableCell>
                          <TableCell className={`text-sm text-right font-medium ${saldo < 0 ? 'text-destructive' : ''}`}>{saldo}</TableCell>
                          <TableCell className="text-sm text-right">{fmtBRL(Number(item.ticket_medio || 0))}</TableCell>
                          <TableCell className="text-sm text-right">{fmtBRL(Number(item.valor_venda || 0))}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{fmtBRL(Number(item.valor_total))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ DESPESAS ════════ */}
          <TabsContent value="despesas" className="space-y-6 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => { setDespForm({ mes: '', categoria: '', valor_planejado: '', valor_executado: '', observacoes: '' }); setDespDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Lançar Despesa
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Planejado</p>
                  <p className="text-xl font-bold">{fmtBRL(despTotalPlanejado)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Executado</p>
                  <p className={`text-xl font-bold ${despTotalExecutado > despTotalPlanejado ? 'text-destructive' : 'text-chart-2'}`}>
                    {fmtBRL(despTotalExecutado)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">% Execução</p>
                  <p className={`text-xl font-bold ${despPctExec > 100 ? 'text-destructive' : ''}`}>{despPctExec}%</p>
                  <Progress value={Math.min(despPctExec, 100)} className="h-2 mt-2" />
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
                  <BarChart data={despChartData}>
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

            {/* Detail table */}
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
                    {despLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : despItems.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lançamento para {ano}</TableCell></TableRow>
                    ) : despItems.map(item => {
                      const saldo = Number(item.valor_planejado) - Number(item.valor_executado);
                      return (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => editDespItem(item)}>
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
          </TabsContent>
        </Tabs>

        {/* Despesas Dialog */}
        <Dialog open={despDialogOpen} onOpenChange={setDespDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Lançar Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mês *</Label>
                  <Select value={despForm.mes} onValueChange={v => setDespForm(f => ({ ...f, mes: v }))}>
                    <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={despForm.categoria} onValueChange={v => setDespForm(f => ({ ...f, categoria: v }))}>
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
                  <Input type="number" step="0.01" value={despForm.valor_planejado} onChange={e => setDespForm(f => ({ ...f, valor_planejado: e.target.value }))} />
                </div>
                <div>
                  <Label>Valor Executado (R$)</Label>
                  <Input type="number" step="0.01" value={despForm.valor_executado} onChange={e => setDespForm(f => ({ ...f, valor_executado: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Input value={despForm.observacoes} onChange={e => setDespForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDespDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleDespSave} disabled={despSaving}>{despSaving ? 'Salvando...' : 'Salvar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
