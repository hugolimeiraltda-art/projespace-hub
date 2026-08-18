import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Network,
  Upload,
  Pencil,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

interface Equipamento {
  id: string;
  tipo_equipamento: string | null;
  equipamento: string;

  ip: string | null;
  ddns: string | null;
  usuario: string | null;
  senha: string | null;
  porta_web: string | null;
  porta_tcp: string | null;
  porta_rtsp: string | null;
  ramal: string | null;
  senha_ramal: string | null;
  ordem: number;
}

interface LinkInternet {
  id: string;
  provedor: string;
  contato: string | null;
  usuario: string | null;
  senha: string | null;
  ip_global: string | null;
  ip: string | null;
  mask: string | null;
  gateway: string | null;
  dns1: string | null;
  dns2: string | null;
  observacoes: string | null;
  ordem: number;
}

const EQUIP_COLS: { key: keyof Equipamento; label: string; width: string }[] = [
  { key: 'tipo_equipamento', label: 'Tipo de equipamento', width: 'min-w-[180px]' },
  { key: 'equipamento', label: 'Local de instalação do equipamento', width: 'min-w-[240px]' },

  { key: 'ip', label: 'IP', width: 'min-w-[130px]' },
  { key: 'ddns', label: 'DDNS', width: 'min-w-[220px]' },
  { key: 'usuario', label: 'Usuário', width: 'min-w-[110px]' },
  { key: 'senha', label: 'Senha', width: 'min-w-[140px]' },
  { key: 'porta_web', label: 'WEB - 80', width: 'min-w-[100px]' },
  { key: 'porta_tcp', label: 'TCP - 8000/37777', width: 'min-w-[120px]' },
  { key: 'porta_rtsp', label: 'RTSP - 554', width: 'min-w-[100px]' },
  { key: 'ramal', label: 'Ramal', width: 'min-w-[90px]' },
  { key: 'senha_ramal', label: 'Senha Ramal', width: 'min-w-[130px]' },
];

export function DocumentacaoRede({ customerId, canEdit }: { customerId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [links, setLinks] = useState<LinkInternet[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, string> } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Equipamento | null>(null);
  const [tipos, setTipos] = useState<string[]>([]);
  const [novoTipoOpen, setNovoTipoOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadTipos = async () => {
    const { data } = await supabase.from('rede_equipamento_tipos').select('nome').order('nome');
    const nomes = ((data as { nome: string }[]) || []).map((t) => t.nome);
    const ordenados = [
      ...nomes.filter((n) => n.trim().toLowerCase() === 'leitor facial'),
      ...nomes.filter((n) => n.trim().toLowerCase() !== 'leitor facial').sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ];
    setTipos(ordenados);
  };

  const inferirTipo = (local: string): string | null => {
    const t = (local || '').toUpperCase();
    if (!t.trim()) return null;
    const regras: [RegExp, string][] = [
      [/FACIAL|BIOMETRI/, 'Leitor facial'],
      [/PLACA|CONTROLADOR/, 'Placa Controladora'],
      [/C[AÂ]MERA|CAM\b|DVR|NVR/, 'Camera IP'],
      [/SWITCH/, 'Switch'],
      [/ROTEADOR|ROUTER/, 'Roteador'],
      [/MODEM|IP GERAL|ONU/, 'Modem'],
      [/NOBREAK|UPS/, 'Nobreak'],
      [/INTERFONE|PORTEIRO/, 'Interfone'],
      [/TOTEM/, 'Totem'],
      [/ALARME|CENTRAL/, 'Central de alarme'],
      [/TAG|LEITOR/, 'Leitor de TAG'],
    ];
    for (const [re, nome] of regras) {
      if (re.test(t)) {
        const match = tipos.find((x) => x.toLowerCase() === nome.toLowerCase());
        if (match) return match;
      }
    }
    return null;
  };

  const criarTipo = async () => {

    const nome = novoTipo.trim();
    if (!nome) return;
    const { error } = await supabase.from('rede_equipamento_tipos').insert({ nome } as never);
    if (error) {
      toast({ title: 'Erro ao criar tipo', description: error.message, variant: 'destructive' });
      return;
    }
    await loadTipos();
    setEditing((prev) => (prev ? { ...prev, values: { ...prev.values, tipo_equipamento: nome } } : prev));
    setNovoTipo('');
    setNovoTipoOpen(false);
    toast({ title: 'Tipo de equipamento criado' });
  };

  const load = async () => {
    setLoading(true);
    const [eq, lk] = await Promise.all([
      supabase.from('customer_rede_equipamentos').select('*').eq('customer_id', customerId).order('ordem'),
      supabase.from('customer_rede_links').select('*').eq('customer_id', customerId).order('ordem'),
    ]);
    setEquipamentos((eq.data as Equipamento[]) || []);
    setLinks((lk.data as LinkInternet[]) || []);
    await loadTipos();
    setLoading(false);
  };


  const openNewEquipamento = () => {
    setEditing({ id: null, values: {} });
  };

  const openEditEquipamento = (row: Equipamento) => {
    const values: Record<string, string> = {};
    EQUIP_COLS.forEach((c) => {
      values[c.key as string] = (row[c.key] as string) || '';
    });
    setEditing({ id: row.id, values });
  };

  const saveEquipamentoDialog = async (continueAfterSave = false) => {
    if (!editing) return;
    const payload: Record<string, string | null> = {};
    EQUIP_COLS.forEach((c) => {
      const k = c.key as string;
      payload[k] = (editing.values[k] || '').trim() || null;
    });
    if (!payload.equipamento) {
      toast({ title: 'Informe o equipamento', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = editing.id
      ? await supabase.from('customer_rede_equipamentos').update(payload as never).eq('id', editing.id)
      : await supabase
          .from('customer_rede_equipamentos')
          .insert({ ...payload, customer_id: customerId, ordem: equipamentos.length } as never);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Equipamento atualizado' : 'Equipamento adicionado' });
    if (continueAfterSave) {
      await load();
      setEditing({ id: null, values: {} });
    } else {
      setEditing(null);
      await load();
    }
  };

  const addLink = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('customer_rede_links')
      .insert({ customer_id: customerId, provedor: 'Novo link', ordem: links.length })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setLinks((prev) => [...prev, data as LinkInternet]);
  };

  const saveEquipamento = async (row: Equipamento, field: keyof Equipamento, value: string) => {
    const { error } = await supabase
      .from('customer_rede_equipamentos')
      .update({ [field]: value || null })
      .eq('id', row.id);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
  };

  const saveLink = async (row: LinkInternet, field: keyof LinkInternet, value: string) => {
    const { error } = await supabase
      .from('customer_rede_links')
      .update({ [field]: value || null })
      .eq('id', row.id);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
  };

  const removeEquipamento = async (id: string) => {
    const { error } = await supabase.from('customer_rede_equipamentos').delete().eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setEquipamentos((prev) => prev.filter((e) => e.id !== id));
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from('customer_rede_links').delete().eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const isSecret = (key: string) => key === 'senha' || key === 'senha_ramal';

  const norm = (v: unknown) =>
    String(v ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

  const cell = (row: unknown[], idx: number | undefined) => {
    if (idx === undefined || idx < 0) return null;
    const v = row[idx];
    const s = String(v ?? '').trim();
    return s === '' || s === '-' ? null : s;
  };

  const findCol = (header: unknown[], ...keywords: string[]) => {
    for (let i = 0; i < header.length; i++) {
      const h = norm(header[i]);
      if (!h) continue;
      if (keywords.some((k) => h.includes(k))) return i;
    }
    return undefined;
  };

  const importPlanilha = async (file: File) => {
    setSaving(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const eqRows: Record<string, string | null>[] = [];
      const lkRows: Record<string, string | null>[] = [];

      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
        let mode: 'none' | 'eq' | 'lk' = 'none';
        let cols: Record<string, number | undefined> = {};

        for (const row of rows) {
          const joined = row.map(norm).join(' | ');
          if (!joined.replace(/\|/g, '').trim()) {
            mode = 'none';
            continue;
          }

          if (joined.includes('EQUIPAMENTO')) {
            mode = 'eq';
            cols = {
              equipamento: findCol(row, 'EQUIPAMENTO'),
              ip: findCol(row, 'IP'),
              ddns: findCol(row, 'DDNS'),
              usuario: findCol(row, 'USUARIO', 'LOGIN'),
              senha: findCol(row, 'SENHA'),
              porta_web: findCol(row, 'WEB'),
              porta_tcp: findCol(row, 'TCP'),
              porta_rtsp: findCol(row, 'RTSP'),
              ramal: findCol(row, 'RAMAL'),
              senha_ramal: undefined,
            };
            // distinguish senha / senha ramal and ramal columns
            const senhaIdxs = row.map((c, i) => ({ i, h: norm(c) })).filter((x) => x.h.includes('SENHA'));
            if (senhaIdxs.length > 1) {
              cols.senha = senhaIdxs[0].i;
              cols.senha_ramal = senhaIdxs[senhaIdxs.length - 1].i;
            }
            continue;
          }

          if (joined.includes('PROVEDOR') || joined.includes('LINK DE INTERNET') || joined.includes('OPERADORA')) {
            mode = 'lk';
            cols = {
              provedor: findCol(row, 'PROVEDOR', 'OPERADORA', 'LINK'),
              contato: findCol(row, 'CONTATO', 'TELEFONE'),
              usuario: findCol(row, 'USUARIO', 'LOGIN'),
              senha: findCol(row, 'SENHA'),
              ip_global: findCol(row, 'IP GLOBAL', 'GLOBAL'),
              ip: findCol(row, 'IP INTERNO', 'IP LAN'),
              mask: findCol(row, 'MASK', 'MASCARA'),
              gateway: findCol(row, 'GATEWAY'),
              dns1: findCol(row, 'DNS 1', 'DNS1', 'DNS PRIMARIO'),
              dns2: findCol(row, 'DNS 2', 'DNS2', 'DNS SECUNDARIO'),
              observacoes: findCol(row, 'OBS'),
            };
            if (cols.ip === undefined) cols.ip = findCol(row, 'IP');
            continue;
          }

          if (mode === 'eq') {
            const equipamento = cell(row, cols.equipamento);
            if (!equipamento) continue;
            eqRows.push({
              equipamento,
              ip: cell(row, cols.ip),
              ddns: cell(row, cols.ddns),
              usuario: cell(row, cols.usuario),
              senha: cell(row, cols.senha),
              porta_web: cell(row, cols.porta_web),
              porta_tcp: cell(row, cols.porta_tcp),
              porta_rtsp: cell(row, cols.porta_rtsp),
              ramal: cell(row, cols.ramal),
              senha_ramal: cell(row, cols.senha_ramal),
            });
          } else if (mode === 'lk') {
            const provedor = cell(row, cols.provedor);
            if (!provedor) continue;
            lkRows.push({
              provedor,
              contato: cell(row, cols.contato),
              usuario: cell(row, cols.usuario),
              senha: cell(row, cols.senha),
              ip_global: cell(row, cols.ip_global),
              ip: cell(row, cols.ip),
              mask: cell(row, cols.mask),
              gateway: cell(row, cols.gateway),
              dns1: cell(row, cols.dns1),
              dns2: cell(row, cols.dns2),
              observacoes: cell(row, cols.observacoes),
            });
          }
        }
      }

      if (eqRows.length === 0 && lkRows.length === 0) {
        toast({
          title: 'Nada encontrado',
          description: 'Não localizei tabelas de Equipamentos ou Links na planilha.',
          variant: 'destructive',
        });
        return;
      }

      if (eqRows.length) {
        const { error } = await supabase.from('customer_rede_equipamentos').insert(
          eqRows.map((r, i) => ({ ...r, customer_id: customerId, ordem: equipamentos.length + i })) as never,
        );
        if (error) throw error;
      }
      if (lkRows.length) {
        const { error } = await supabase.from('customer_rede_links').insert(
          lkRows.map((r, i) => ({ ...r, customer_id: customerId, ordem: links.length + i })) as never,
        );
        if (error) throw error;
      }

      toast({
        title: 'Planilha importada',
        description: `${eqRows.length} equipamento(s) e ${lkRows.length} link(s) adicionados.`,
      });
      await load();
    } catch (e) {
      toast({ title: 'Erro ao importar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderTabelaEquipamentos = () => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-muted">
          {EQUIP_COLS.map((c) => (
            <th key={c.key} className={`text-left font-semibold p-2 border ${c.width}`}>
              {c.label}
            </th>
          ))}
          {canEdit && <th className="p-2 border w-10" />}
        </tr>
      </thead>
      <tbody>
        {equipamentos.map((row) => (
          <tr
            key={row.id}
            className={canEdit ? 'hover:bg-muted/50 cursor-pointer' : undefined}
            onDoubleClick={() => canEdit && openEditEquipamento(row)}
          >
            {EQUIP_COLS.map((c) => {
              const value = (row[c.key] as string) || '';
              const masked = isSecret(c.key as string) && !showSecrets && value ? '••••••••' : value;
              return (
                <td key={c.key} className="border p-2 align-middle whitespace-nowrap">
                  {masked || <span className="text-muted-foreground">-</span>}
                </td>
              );
            })}
            {canEdit && (
              <td className="border p-1">
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEquipamento(row)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-8 w-8"
                    onClick={() => setConfirmDelete(row)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" /> Documentação de Rede
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSecrets((s) => !s)}>
            {showSecrets ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSecrets ? 'Ocultar senhas' : 'Mostrar senhas'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFullscreen(true)}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Tela cheia
          </Button>
          {canEdit && (
            <>
              <input
                id={`rede-import-${customerId}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importPlanilha(f);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => document.getElementById(`rede-import-${customerId}`)?.click()}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Importar planilha
              </Button>
              <Button size="sm" onClick={openNewEquipamento} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Equipamento
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              {equipamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  {renderTabelaEquipamentos()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Links de Internet</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowLinks((s) => !s)}>
                    {showLinks ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                    {showLinks ? 'Ocultar links' : 'Exibir links'}
                  </Button>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={addLink} disabled={saving}>
                      <Plus className="w-4 h-4 mr-2" /> Link
                    </Button>
                  )}
                </div>
              </div>
              {showLinks && (
                <>
                  {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum link cadastrado.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {links.map((row) => (
                        <div key={row.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Label>Provedor / Link</Label>
                              <Input
                                defaultValue={row.provedor}
                                disabled={!canEdit}
                                onBlur={(e) => saveLink(row, 'provedor', e.target.value)}
                              />
                            </div>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive mt-6"
                                onClick={() => removeLink(row.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {([
                              ['contato', 'Contato'],
                              ['usuario', 'Usuário'],
                              ['senha', 'Senha'],
                              ['ip_global', 'IP Global'],
                              ['ip', 'IP'],
                              ['mask', 'Mask'],
                              ['gateway', 'Gateway'],
                              ['dns1', 'DNS 1'],
                              ['dns2', 'DNS 2'],
                              ['observacoes', 'Observações'],
                            ] as [keyof LinkInternet, string][]).map(([key, label]) => (
                              <div key={key}>
                                <Label>{label}</Label>
                                <Input
                                  type={key === 'senha' && !showSecrets ? 'password' : 'text'}
                                  defaultValue={(row[key] as string) || ''}
                                  disabled={!canEdit}
                                  onBlur={(e) => saveLink(row, key, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {!showLinks && links.length > 0 && (
                <p className="text-sm text-muted-foreground">{links.length} link(s) oculto(s).</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {EQUIP_COLS.map((c) =>
              c.key === 'tipo_equipamento' ? (
                <div key={c.key} className="md:col-span-2">
                  <Label>{c.label}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={editing?.values.tipo_equipamento || ''}
                      onValueChange={(v) =>
                        setEditing((prev) => (prev ? { ...prev, values: { ...prev.values, tipo_equipamento: v } } : prev))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setNovoTipoOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Novo tipo
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={c.key} className={c.key === 'equipamento' || c.key === 'ddns' ? 'md:col-span-2' : ''}>
                  <Label>{c.label}</Label>
                  <Input
                    type={isSecret(c.key as string) && !showSecrets ? 'password' : 'text'}
                    value={editing?.values[c.key as string] || ''}
                    onChange={(e) =>
                      setEditing((prev) => {
                        if (!prev) return prev;
                        const key = c.key as string;
                        const values = { ...prev.values, [key]: e.target.value };
                        if (key === 'equipamento') {
                          const sugerido = inferirTipo(e.target.value);
                          if (sugerido) values.tipo_equipamento = sugerido;
                        }
                        return { ...prev, values };
                      })
                    }
                  />
                </div>
              ),

            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saveEquipamentoDialog(true)} disabled={saving} variant="outline">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar e continuar
            </Button>
            <Button onClick={() => saveEquipamentoDialog(false)} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={novoTipoOpen} onOpenChange={setNovoTipoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo tipo de equipamento</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome do tipo</Label>
            <Input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} placeholder="Ex: Leitor facial" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoTipoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={criarTipo}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir "{confirmDelete?.equipamento}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) await removeEquipamento(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Documentação de Rede — Tela cheia</h2>
              <span className="text-sm text-muted-foreground">({equipamentos.length} equipamentos)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSecrets((s) => !s)}>
                {showSecrets ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showSecrets ? 'Ocultar senhas' : 'Mostrar senhas'}
              </Button>
              {canEdit && (
                <Button size="sm" onClick={openNewEquipamento} disabled={saving}>
                  <Plus className="w-4 h-4 mr-2" />
                  Equipamento
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setFullscreen(false)}>
                <Minimize2 className="w-4 h-4 mr-2" />
                Sair da tela cheia
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {equipamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
            ) : (
              renderTabelaEquipamentos()
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
