import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Download, Camera, ImageIcon } from 'lucide-react';

type Equip = { nome: string; qtd?: number; instalado?: boolean };
type Ambiente = {
  id: string;
  project_id: string;
  ordem: number;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  equipamentos: Equip[];
  fotos_antes: string[];
  fotos_depois: string[];
  concluido: boolean;
  concluido_at: string | null;
  concluido_por: string | null;
};

type Mode = 'backoffice' | 'execucao' | 'leitura';

const MAX_W = 1920;
const QUAL = 0.7;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_W) { height = Math.round(height * (MAX_W / width)); width = MAX_W; }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      c.toBlob((b) => resolve(b ? new File([b], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }) : file), 'image/webp', QUAL);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Fotos "antes" vêm do bucket de orçamentos com prefixo "orc:"; "depois" ficam nos anexos do projeto.
async function signPath(p: string): Promise<string | null> {
  if (p.startsWith('http')) return p;
  const bucket = p.startsWith('orc:') ? 'orcamento-midias' : 'project-attachments';
  const path = p.replace(/^orc:/, '');
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function Fotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all(paths.map(signPath)).then((u) => alive && setUrls(u.filter(Boolean) as string[]));
    return () => { alive = false; };
  }, [paths.join('|')]);
  if (paths.length === 0) return <p className="text-xs text-muted-foreground italic">Sem fotos</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="" className="h-20 w-20 rounded-md object-cover border" />
        </a>
      ))}
    </div>
  );
}

export function EapObra({ projectId, mode, titled }: { projectId: string; mode: Mode; titled?: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data }, { data: proj }] = await Promise.all([
      supabase.from('implantacao_eap_ambientes').select('*').eq('project_id', projectId).order('ordem'),
      supabase.from('projects').select('observacoes').eq('id', projectId).maybeSingle(),
    ]);
    setAmbientes((data as any) || []);
    setSessaoId(proj?.observacoes?.match(/\[PROJETO_IA:([^\]]+)\]/)?.[1] || null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const importar = async () => {
    if (!sessaoId) return;
    setBusy('import');
    try {
      const { data: s } = await supabase.from('orcamento_sessoes').select('proposta_gerada').eq('id', sessaoId).maybeSingle();
      let parsed: any = null;
      try { parsed = JSON.parse(s?.proposta_gerada || ''); } catch { parsed = null; }
      const itens = parsed?.itens;
      const { data: midias } = await supabase.from('orcamento_midias').select('arquivo_url, nome_arquivo, tipo').eq('sessao_id', sessaoId);
      const byName: Record<string, string> = {};
      (midias || []).forEach((m: any) => { if (m.tipo === 'foto') byName[m.nome_arquivo] = 'orc:' + m.arquivo_url; });
      let lista: any[] = itens?.ambientes || [];
      if (lista.length === 0) {
        const all = [...(itens?.kits || []), ...(itens?.avulsos || [])];
        lista = [{ nome: 'Geral', tipo: 'geral', equipamentos: all.map((i: any) => `${i.qtd}x ${i.nome}`), fotos: Object.keys(byName) }];
      }
      const rows = lista.map((a: any, i: number) => ({
        project_id: projectId,
        ordem: i,
        nome: a.nome || `Ambiente ${i + 1}`,
        tipo: a.tipo || null,
        descricao: a.descricao_funcionamento || null,
        equipamentos: (a.equipamentos || []).map((e: string) => ({ nome: e, instalado: false })),
        fotos_antes: (a.fotos || []).map((f: string) => (f.startsWith('http') ? f : byName[f])).filter(Boolean),
      }));
      if (rows.length === 0) throw new Error('A proposta não tem ambientes nem equipamentos.');
      const { error } = await supabase.from('implantacao_eap_ambientes').insert(rows);
      if (error) throw error;
      toast({ title: 'EAP carregada', description: `${rows.length} ambiente(s) trazidos da proposta.` });
      load();
    } catch (e: any) {
      toast({ title: 'Não foi possível carregar a EAP', description: e.message, variant: 'destructive' });
    }
    setBusy(null);
  };

  const save = async (id: string, patch: Partial<Ambiente>) => {
    setAmbientes((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from('implantacao_eap_ambientes').update(patch as any).eq('id', id);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
  };

  const addAmbiente = async () => {
    const { error } = await supabase.from('implantacao_eap_ambientes').insert({ project_id: projectId, ordem: ambientes.length, nome: 'Novo ambiente' });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    load();
  };

  const removeAmbiente = async (a: Ambiente) => {
    if (!confirm(`Excluir o ambiente "${a.nome}"?`)) return;
    await supabase.from('implantacao_eap_ambientes').delete().eq('id', a.id);
    load();
  };

  const uploadFotos = async (a: Ambiente, files: FileList | null, campo: 'fotos_antes' | 'fotos_depois') => {
    if (!files?.length) return;
    if (a[campo].length + files.length > 15) {
      toast({ title: 'Limite de 15 fotos por ambiente', variant: 'destructive' });
      return;
    }
    setBusy(a.id + campo);
    const novos: string[] = [];
    for (const f of Array.from(files)) {
      const file = await compress(f);
      const path = `${projectId}/eap/${a.id}/${campo}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('project-attachments').upload(path, file);
      if (error) toast({ title: 'Erro no envio', description: f.name, variant: 'destructive' });
      else novos.push(path);
    }
    await save(a.id, { [campo]: [...a[campo], ...novos] } as any);
    setBusy(null);
  };

  const toggleConcluido = async (a: Ambiente, v: boolean) => {
    if (v && a.fotos_depois.length === 0) {
      toast({ title: 'Foto do depois obrigatória', description: 'Anexe ao menos uma foto do ambiente finalizado.', variant: 'destructive' });
      return;
    }
    let nome: string | null = null;
    if (v) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase.from('profiles').select('nome').eq('id', u.user.id).maybeSingle();
        nome = p?.nome || u.user.email || null;
      }
    }
    save(a.id, { concluido: v, concluido_at: v ? new Date().toISOString() : null, concluido_por: nome });
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const feitos = ambientes.filter((a) => a.concluido).length;
  const editavel = mode === 'backoffice';

  if (mode === 'leitura' && ambientes.length === 0) return null;

  const body = (
    <div className="space-y-3">
      {ambientes.length === 0 && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
          <p>Nenhum ambiente na EAP da obra ainda.</p>
          {editavel && (
            <div className="flex flex-wrap gap-2">
              {sessaoId && (
                <Button size="sm" onClick={importar} disabled={busy === 'import'}>
                  {busy === 'import' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Carregar EAP da proposta
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={addAmbiente}><Plus className="h-4 w-4 mr-1" />Adicionar ambiente</Button>
            </div>
          )}
          {mode === 'execucao' && <p>O backoffice precisa montar a EAP na etapa 4.1 antes.</p>}
        </div>
      )}
      {ambientes.map((a) => (
        <div key={a.id} className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            {editavel ? (
              <Input defaultValue={a.nome} className="h-8 font-medium" onBlur={(e) => e.target.value !== a.nome && save(a.id, { nome: e.target.value })} />
            ) : (
              <span className="font-medium">{a.nome}</span>
            )}
            {a.concluido ? <Badge>Concluído</Badge> : <Badge variant="outline">Pendente</Badge>}
            {editavel && (
              <Button size="icon" variant="ghost" onClick={() => removeAmbiente(a)} aria-label="Excluir ambiente"><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Equipamentos</p>
            {a.equipamentos.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum equipamento</p>}
            {a.equipamentos.map((eq, i) => (
              <div key={i} className="flex items-center gap-2">
                {mode === 'execucao' ? (
                  <Checkbox
                    checked={!!eq.instalado}
                    onCheckedChange={(v) => save(a.id, { equipamentos: a.equipamentos.map((x, j) => (j === i ? { ...x, instalado: !!v } : x)) })}
                  />
                ) : mode === 'leitura' ? (
                  <span className={eq.instalado ? 'text-primary text-xs' : 'text-muted-foreground text-xs'}>{eq.instalado ? '✓' : '○'}</span>
                ) : null}
                {editavel ? (
                  <Input
                    defaultValue={eq.nome}
                    className="h-7 text-sm"
                    onBlur={(e) => e.target.value !== eq.nome && save(a.id, { equipamentos: a.equipamentos.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })}
                  />
                ) : (
                  <span className="text-sm">{eq.nome}</span>
                )}
                {editavel && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover equipamento"
                    onClick={() => save(a.id, { equipamentos: a.equipamentos.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {editavel && (
              <Button size="sm" variant="ghost" onClick={() => save(a.id, { equipamentos: [...a.equipamentos, { nome: '1x Novo equipamento', instalado: false }] })}>
                <Plus className="h-4 w-4 mr-1" />Equipamento
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />Antes</p>
              <Fotos paths={a.fotos_antes} />
              {editavel && (
                <label className="inline-flex items-center gap-1 text-xs text-primary cursor-pointer">
                  {busy === a.id + 'fotos_antes' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Adicionar foto do antes
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFotos(a, e.target.files, 'fotos_antes')} />
                </label>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Depois</p>
              <Fotos paths={a.fotos_depois} />
              {mode !== 'leitura' && (
                <label className="inline-flex items-center gap-1 text-xs text-primary cursor-pointer">
                  {busy === a.id + 'fotos_depois' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}Tirar/anexar foto do depois
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => uploadFotos(a, e.target.files, 'fotos_depois')} />
                </label>
              )}
            </div>
          </div>

          {mode === 'execucao' && (
            <div className="flex items-center gap-2 border-t pt-2">
              <Checkbox checked={a.concluido} onCheckedChange={(v) => toggleConcluido(a, !!v)} />
              <span className="text-sm">Ambiente concluído</span>
            </div>
          )}
          {a.concluido && a.concluido_at && (
            <p className="text-xs text-muted-foreground">
              Concluído em {new Date(a.concluido_at).toLocaleDateString('pt-BR')}{a.concluido_por ? ` por ${a.concluido_por}` : ''}
            </p>
          )}
        </div>
      ))}
      {editavel && ambientes.length > 0 && (
        <Button size="sm" variant="outline" onClick={addAmbiente}><Plus className="h-4 w-4 mr-1" />Adicionar ambiente</Button>
      )}
    </div>
  );

  if (mode === 'leitura' || titled) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">EAP da Obra · Antes e Depois por Ambiente ({feitos}/{ambientes.length} concluídos)</CardTitle></CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {ambientes.length > 0 && <p className="text-xs text-muted-foreground">{feitos} de {ambientes.length} ambientes concluídos</p>}
      {body}
    </div>
  );
}
