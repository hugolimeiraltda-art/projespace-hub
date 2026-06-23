import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ClipboardCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface Item {
  id: string;
  label: string;
  checked: boolean;
  resposta?: 'sim' | 'nao' | null;
  observacao?: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checklist-externo`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function ChecklistExterno() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar');
        setTitle(data.title);
        setProject(data.project);
        setItems(data.dados?.items || []);
        setObservacoes(data.observacoes || '');
        setSubmittedAt(data.submitted_at);
        setSubmittedBy(data.submitted_by);
      } catch (e: any) {
        setError(e.message || 'Erro');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const setResposta = (id: string, r: 'sim' | 'nao') =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, resposta: r, checked: r === 'sim', observacao: r === 'sim' ? '' : it.observacao }
          : it,
      ),
    );

  const updateObs = (id: string, obs: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, observacao: obs } : it)));

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe seu nome', variant: 'destructive' });
      return;
    }
    const semResposta = items.filter((i) => !i.resposta).length;
    if (semResposta > 0) {
      toast({ title: 'Itens pendentes', description: `${semResposta} itens sem resposta.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token!)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ items, observacoes, nome, telefone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setSubmittedAt(new Date().toISOString());
      setSubmittedBy(nome);
      toast({ title: 'Checklist enviado', description: 'Obrigado! As respostas foram registradas.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Verifique o link com a equipe responsável.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const done = items.filter((i) => i.resposta).length;
  const percent = items.length ? (done / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {project && (
              <p className="text-sm text-muted-foreground">
                {project.cliente_condominio_nome}
                {project.cliente_cidade ? ` • ${project.cliente_cidade}/${project.cliente_estado || ''}` : ''}
              </p>
            )}
          </div>
        </div>

        {submittedAt && (
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="pt-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700">Checklist já enviado</p>
                <p className="text-muted-foreground">
                  Enviado por <strong>{submittedBy || '—'}</strong> em{' '}
                  {new Date(submittedAt).toLocaleString('pt-BR')}. Você ainda pode revisar e reenviar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm text-muted-foreground">
                {done}/{items.length} itens
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação do técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nome completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <Label className="text-xs">Telefone (opcional)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens do checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const r = item.resposta ?? (item.checked ? 'sim' : null);
              return (
                <div key={item.id} className="space-y-2 pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <Label className={cn('flex-1 pt-1.5', r === 'sim' && 'text-muted-foreground')}>
                      {item.label}
                    </Label>
                    <div className="flex items-center gap-1 shrink-0 rounded-lg border p-0.5 bg-muted/30">
                      <button
                        type="button"
                        onClick={() => setResposta(item.id, 'sim')}
                        className={cn(
                          'px-3 py-1 text-xs font-semibold rounded-md transition-colors',
                          r === 'sim' ? 'bg-green-500 text-white' : 'text-muted-foreground',
                        )}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setResposta(item.id, 'nao')}
                        className={cn(
                          'px-3 py-1 text-xs font-semibold rounded-md transition-colors',
                          r === 'nao' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground',
                        )}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                  {r === 'nao' && (
                    <Textarea
                      placeholder="Descreva o problema encontrado..."
                      value={item.observacao || ''}
                      onChange={(e) => updateObs(item.id, e.target.value)}
                      className="text-sm min-h-[70px]"
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a instalação..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
          {saving ? 'Enviando...' : submittedAt ? 'Reenviar checklist' : 'Enviar checklist'}
        </Button>
      </div>
    </div>
  );
}
