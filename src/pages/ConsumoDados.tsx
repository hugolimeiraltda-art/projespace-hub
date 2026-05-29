import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, HardDrive, Download, Trash2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

interface TableStat { name: string; module: string; label: string; dateCol: string; rows: number; }
interface BucketStat { name: string; files: number; sizeBytes: number; }

const fmtBytes = (b: number) => {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
};

export default function ConsumoDados() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableStat[]>([]);
  const [buckets, setBuckets] = useState<BucketStat[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [dialog, setDialog] = useState<null | {
    kind: 'table' | 'bucket';
    name: string;
    label: string;
    rows?: number;
    sizeBytes?: number;
  }>(null);
  const [cutoff, setCutoff] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10);
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-admin', { body: { action: 'stats' } });
      if (error) throw error;
      setTables(data.tables || []);
      setBuckets(data.buckets || []);
    } catch (e: any) {
      toast.error('Erro ao carregar estatísticas', { description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const callDownload = async (action: string, params: any, filename: string) => {
    setBusy(filename);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://rxehpdmcwfxkabrnwhoi.supabase.co/functions/v1/data-admin`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action, params }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Backup gerado');
    } catch (e: any) {
      toast.error('Falha no backup', { description: e.message });
    } finally { setBusy(null); }
  };

  const confirmDelete = async () => {
    if (!dialog) return;
    setBusy('delete');
    try {
      const action = dialog.kind === 'table' ? 'delete_table_period' : 'delete_bucket_period';
      const params = dialog.kind === 'table'
        ? { table: dialog.name, before: cutoff }
        : { bucket: dialog.name, before: cutoff };
      const { data, error } = await supabase.functions.invoke('data-admin', { body: { action, params } });
      if (error) throw error;
      toast.success('Exclusão concluída', {
        description: dialog.kind === 'table'
          ? `${data.deleted} registros removidos`
          : `${data.deleted} arquivos removidos (${fmtBytes(data.freedBytes)})`,
      });
      setDialog(null);
      loadStats();
    } catch (e: any) {
      toast.error('Falha ao excluir', { description: e.message });
    } finally { setBusy(null); }
  };

  const totalBucketBytes = buckets.reduce((s, b) => s + b.sizeBytes, 0);
  const totalRows = tables.reduce((s, t) => s + t.rows, 0);

  const grouped = tables.reduce<Record<string, TableStat[]>>((acc, t) => {
    (acc[t.module] ||= []).push(t); return acc;
  }, {});

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consumo de Dados</h1>
            <p className="text-muted-foreground mt-1">
              Veja o que cada módulo consome, faça backup e limpe dados por período.
            </p>
          </div>
          <Button variant="outline" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Database className="w-4 h-4" /> Linhas (tabelas monitoradas)</CardDescription>
              <CardTitle className="text-2xl">{totalRows.toLocaleString('pt-BR')}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Storage total</CardDescription>
              <CardTitle className="text-2xl">{fmtBytes(totalBucketBytes)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Buckets ativos</CardDescription>
              <CardTitle className="text-2xl">{buckets.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="tabelas">
          <TabsList>
            <TabsTrigger value="tabelas">Tabelas por módulo</TabsTrigger>
            <TabsTrigger value="storage">Arquivos (Storage)</TabsTrigger>
          </TabsList>

          <TabsContent value="tabelas" className="space-y-4">
            {loading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando…</CardContent></Card>
            ) : Object.entries(grouped).map(([mod, list]) => (
              <Card key={mod}>
                <CardHeader>
                  <CardTitle className="text-base">{mod}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabela</TableHead>
                        <TableHead className="text-right">Linhas</TableHead>
                        <TableHead className="w-[360px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map(t => (
                        <TableRow key={t.name}>
                          <TableCell>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-xs text-muted-foreground font-mono">{t.name}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{t.rows.toLocaleString('pt-BR')}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" disabled={busy !== null || t.rows === 0}
                              onClick={() => callDownload('backup_table', { table: t.name }, `backup-${t.name}.json`)}>
                              {busy === `backup-${t.name}.json` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                              Backup
                            </Button>
                            <Button size="sm" variant="destructive" disabled={busy !== null || t.rows === 0}
                              onClick={() => setDialog({ kind: 'table', name: t.name, label: t.label, rows: t.rows })}>
                              <Trash2 className="w-3 h-3 mr-1" /> Excluir por período
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="storage">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando…</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bucket</TableHead>
                        <TableHead className="text-right">Arquivos</TableHead>
                        <TableHead className="text-right">Tamanho</TableHead>
                        <TableHead className="w-[400px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buckets.map(b => (
                        <TableRow key={b.name}>
                          <TableCell className="font-mono">{b.name}</TableCell>
                          <TableCell className="text-right">{b.files.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-medium">{fmtBytes(b.sizeBytes)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" disabled={busy !== null || b.files === 0}
                              onClick={() => callDownload('backup_bucket_list', { bucket: b.name }, `backup-${b.name}.csv`)}>
                              {busy === `backup-${b.name}.csv` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                              Backup (CSV de URLs)
                            </Button>
                            <Button size="sm" variant="destructive" disabled={busy !== null || b.files === 0}
                              onClick={() => setDialog({ kind: 'bucket', name: b.name, label: b.name, sizeBytes: b.sizeBytes })}>
                              <Trash2 className="w-3 h-3 mr-1" /> Excluir por período
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Excluir por período
              </DialogTitle>
              <DialogDescription>
                {dialog?.kind === 'table'
                  ? <>Tudo da tabela <span className="font-mono">{dialog?.name}</span> com data anterior ao corte será <b>removido permanentemente</b>. Faça backup antes.</>
                  : <>Todos os arquivos do bucket <span className="font-mono">{dialog?.name}</span> criados antes do corte serão <b>removidos permanentemente</b>. Faça backup da lista (CSV) antes.</>}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cutoff">Excluir registros anteriores a</Label>
              <Input id="cutoff" type="date" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
              <div className="flex gap-2 flex-wrap pt-1">
                {[30, 60, 90, 180, 365].map(d => (
                  <Button key={d} size="sm" variant="outline" type="button"
                    onClick={() => {
                      const dt = new Date(); dt.setDate(dt.getDate() - d);
                      setCutoff(dt.toISOString().slice(0, 10));
                    }}>
                    &gt; {d} dias
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={busy === 'delete'}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={busy === 'delete'}>
                {busy === 'delete' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir definitivamente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
