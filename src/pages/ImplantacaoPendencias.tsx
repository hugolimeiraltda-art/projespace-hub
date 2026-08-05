import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Loader2, Search } from 'lucide-react';

type Tipo = 'TODOS' | 'PCI' | 'PPE';

interface Row {
  projectId: string;
  contrato: string;
  cliente: string;
  cidadeUf: string;
  vendedor: string;
  tipo: 'PCI' | 'PPE';
  statusPendencia: string;
  desde: string | null;
  diasPendencia: number | null;
  etapasAbertas: string[];
  inicio: string | null;
  prazo: string | null;
  observacoes: string;
}

interface OsRow {
  contrato: string;
  cliente: string;
  numeroOs: string;
  tipo: string;
  setor: string;
  descricao: string;
  status: string;
  slaDias: number | null;
  abertura: string | null;
  diasAberto: number | null;
  responsavel: string;
}

const pendLabel: Record<string, string> = {
  PENDENCIA_CLIENTE: 'Pendência Cliente',
  PENDENCIA_COMERCIAL: 'Pendência Comercial',
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const diasDe = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

export default function ImplantacaoPendencias() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tipo, setTipo] = useState<Tipo>((searchParams.get('tipo')?.toUpperCase() as Tipo) || 'TODOS');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [osRows, setOsRows] = useState<OsRow[]>([]);
  const [search, setSearch] = useState('');
  const [filtroPendencia, setFiltroPendencia] = useState<'TODAS' | 'STATUS' | 'ETAPAS'>('TODAS');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: projects } = await supabase
        .from('projects')
        .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, implantacao_status, implantacao_started_at, prazo_entrega_projeto, tipo_implantacao, pendencia_status, pendencia_status_at')
        .eq('sale_status', 'CONCLUIDO')
        .neq('implantacao_status', 'CONCLUIDO_IMPLANTACAO');

      const projIds = (projects || []).map(p => p.id);
      if (projIds.length === 0) {
        setRows([]);
        setOsRows([]);
        return;
      }

      const [etapasRes, portfolioRes] = await Promise.all([
        supabase.from('implantacao_etapas').select('*').in('project_id', projIds),
        supabase.from('customer_portfolio').select('id, project_id, contrato, razao_social').in('project_id', projIds),
      ]);

      const etapasMap: Record<string, any> = {};
      (etapasRes.data || []).forEach((e: any) => { etapasMap[e.project_id] = e; });
      const portfolioMap: Record<string, any> = {};
      (portfolioRes.data || []).forEach((c: any) => { portfolioMap[c.project_id] = c; });

      const custIds = (portfolioRes.data || []).map((c: any) => c.id);
      let pendencias: any[] = [];
      if (custIds.length > 0) {
        const { data } = await supabase
          .from('manutencao_pendencias')
          .select('customer_id, numero_os, contrato, razao_social, tipo, setor, descricao, status, sla_dias, data_abertura, created_by_name')
          .in('customer_id', custIds)
          .neq('status', 'CANCELADO')
          .order('data_abertura', { ascending: false });
        pendencias = data || [];
      }

      const built: Row[] = [];
      for (const proj of projects || []) {
        const e: any = etapasMap[proj.id] || {};
        const isPPE = proj.tipo_implantacao === 'PPE';
        const steps: [string, any][] = isPPE
          ? [
              ['1. Contrato assinado', e.contrato_assinado_at],
              ['3.1 Ligação de boas vindas', e.ligacao_boas_vindas_at],
              ['3.7 Instalação da base', e.ppe_execucao_base_data],
              ['4.1 Visita de conclusão (Totem)', e.agendamento_visita_startup_data],
              ['Laudo da visita', e.laudo_visita_startup_at],
              ['Check de programação', e.check_programacao_at],
              ['Ativação financeira', e.confirmacao_ativacao_financeira_at],
            ]
          : [
              ['1. Contrato assinado', e.contrato_assinado_at],
              ['2. Ligação de boas vindas', e.ligacao_boas_vindas_at],
              ['3. Agendamento visita startup', e.agendamento_visita_startup_at],
              ['4. Laudo da visita', e.laudo_visita_startup_at],
              ['5. Check de programação', e.check_programacao_at],
              ['6. Ativação financeira', e.confirmacao_ativacao_financeira_at],
            ];
        const abertas = steps.filter(([, v]) => !v).map(([l]) => l);
        const statusPend = (proj as any).pendencia_status
          ? pendLabel[(proj as any).pendencia_status] || (proj as any).pendencia_status
          : '';
        if (!statusPend && abertas.length === 0) continue;
        built.push({
          projectId: proj.id,
          contrato: portfolioMap[proj.id]?.contrato || `${isPPE ? 'PPE' : 'PCI'}-${proj.numero_projeto}`,
          cliente: proj.cliente_condominio_nome || '',
          cidadeUf: `${proj.cliente_cidade || ''}${proj.cliente_estado ? '/' + proj.cliente_estado : ''}`,
          vendedor: proj.vendedor_nome || '',
          tipo: isPPE ? 'PPE' : 'PCI',
          statusPendencia: statusPend,
          desde: (proj as any).pendencia_status_at || null,
          diasPendencia: diasDe((proj as any).pendencia_status_at || null),
          etapasAbertas: abertas,
          inicio: proj.implantacao_started_at || proj.created_at,
          prazo: proj.prazo_entrega_projeto,
          observacoes: [e.ppe_observacao_onboarding, e.ppe_observacao_instalacao]
            .filter(Boolean)
            .join(' | '),
        });
      }

      const custById = new Map((portfolioRes.data || []).map((c: any) => [c.id, c]));
      const os: OsRow[] = pendencias.map((p: any) => {
        const c: any = p.customer_id ? custById.get(p.customer_id) : null;
        return {
          contrato: p.contrato || c?.contrato || '',
          cliente: p.razao_social || c?.razao_social || '',
          numeroOs: p.numero_os || '',
          tipo: p.tipo || '',
          setor: p.setor || '',
          descricao: p.descricao || '',
          status: p.status || '',
          slaDias: p.sla_dias ?? null,
          abertura: p.data_abertura || null,
          diasAberto: diasDe(p.data_abertura || null),
          responsavel: p.created_by_name || '',
        };
      });

      setRows(built);
      setOsRows(os);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao carregar pendências', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(r => (tipo === 'TODOS' ? true : r.tipo === tipo))
      .filter(r => {
        if (filtroPendencia === 'STATUS') return !!r.statusPendencia;
        if (filtroPendencia === 'ETAPAS') return r.etapasAbertas.length > 0;
        return true;
      })
      .filter(r => !term || r.cliente.toLowerCase().includes(term) || r.contrato.toLowerCase().includes(term) || r.vendedor.toLowerCase().includes(term) || r.observacoes.toLowerCase().includes(term))
      .sort((a, b) => (b.diasPendencia ?? -1) - (a.diasPendencia ?? -1) || b.etapasAbertas.length - a.etapasAbertas.length);
  }, [rows, tipo, search, filtroPendencia]);

  const filteredOs = useMemo(() => {
    const contratos = new Set(filtered.map(r => r.contrato));
    return osRows.filter(o => contratos.size === 0 || contratos.has(o.contrato));
  }, [osRows, filtered]);

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const obras = filtered.map(r => ({
      'Contrato': r.contrato,
      'Cliente': r.cliente,
      'Cidade/UF': r.cidadeUf,
      'Vendedor': r.vendedor,
      'Tipo': r.tipo,
      'Pendência (status)': r.statusPendencia || '—',
      'Desde': fmt(r.desde),
      'Dias em pendência': r.diasPendencia ?? '',
      'Etapas em aberto': r.etapasAbertas.join(' | '),
      'Qtd etapas em aberto': r.etapasAbertas.length,
      'Início implantação': fmt(r.inicio),
      'Prazo de entrega': fmt(r.prazo),
      'Observações': r.observacoes,
    }));
    const os = filteredOs.map(o => ({
      'Contrato': o.contrato,
      'Cliente': o.cliente,
      'Nº OS': o.numeroOs,
      'Tipo': o.tipo,
      'Setor': o.setor,
      'Descrição': o.descricao,
      'Status': o.status,
      'SLA (dias)': o.slaDias ?? '',
      'Abertura': fmt(o.abertura),
      'Dias em aberto': o.diasAberto ?? '',
      'Aberto por': o.responsavel,
    }));
    const add = (data: Record<string, any>[], name: string) => {
      if (data.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: ['Descrição', 'Etapas em aberto', 'Cliente', 'Observações'].includes(k) ? 45 : Math.max(12, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    add(obras, 'Pendências Obras');
    add(os, 'Pendências OS');
    XLSX.writeFile(wb, `pendencias-implantacao-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalEtapas = filtered.reduce((s, r) => s + r.etapasAbertas.length, 0);
  const comStatus = filtered.filter(r => !!r.statusPendencia).length;

  return (
    <Layout>
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="w-7 h-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Pendências de Implantação</h1>
            </div>
            <p className="text-muted-foreground">Obras em andamento com pendências de status e etapas em aberto</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Voltar
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={filtered.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Obras com pendência</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendência de status</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{comStatus}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Etapas em aberto</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalEtapas}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">OS em aberto</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filteredOs.length}</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por cliente, contrato ou vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={(v: Tipo) => setTipo(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              <SelectItem value="PCI">PCI</SelectItem>
              <SelectItem value="PPE">PPE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroPendencia} onValueChange={(v: 'TODAS' | 'STATUS' | 'ETAPAS') => setFiltroPendencia(v)}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as pendências</SelectItem>
              <SelectItem value="STATUS">Somente pendência de status</SelectItem>
              <SelectItem value="ETAPAS">Somente etapas em aberto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle>Pendências das Obras ({filtered.length})</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pendência</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                      <TableHead>Etapas em aberto</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma pendência encontrada</TableCell></TableRow>
                    )}
                    {filtered.map(r => (
                      <TableRow key={r.projectId} className="cursor-pointer" onClick={() => navigate(`/startup-projetos/${r.projectId}/execucao`)}>
                        <TableCell className="font-medium">{r.contrato}</TableCell>
                        <TableCell>{r.cliente}</TableCell>
                        <TableCell>{r.cidadeUf}</TableCell>
                        <TableCell>{r.vendedor}</TableCell>
                        <TableCell><Badge variant="outline">{r.tipo}</Badge></TableCell>
                        <TableCell>{r.statusPendencia ? <Badge variant="destructive">{r.statusPendencia}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{fmt(r.desde)}</TableCell>
                        <TableCell className="text-right">{r.diasPendencia ?? '—'}</TableCell>
                        <TableCell className="max-w-[420px]">
                          {r.etapasAbertas.length === 0 ? <span className="text-muted-foreground">—</span> : (
                            <div className="flex flex-wrap gap-1">
                              {r.etapasAbertas.map(s => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{fmt(r.prazo)}</TableCell>
                        <TableCell className="max-w-[320px] whitespace-pre-wrap text-sm">
                          {r.observacoes || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {filteredOs.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Pendências de OS ({filteredOs.length})</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Nº OS</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead className="text-right">Dias</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOs.map((o, i) => (
                        <TableRow key={`${o.numeroOs}-${i}`}>
                          <TableCell className="font-medium">{o.contrato}</TableCell>
                          <TableCell>{o.cliente}</TableCell>
                          <TableCell>{o.numeroOs}</TableCell>
                          <TableCell>{o.tipo}</TableCell>
                          <TableCell>{o.setor}</TableCell>
                          <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                          <TableCell>{fmt(o.abertura)}</TableCell>
                          <TableCell className="text-right">{o.diasAberto ?? '—'}</TableCell>
                          <TableCell className="max-w-[420px] whitespace-pre-wrap">{o.descricao}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
