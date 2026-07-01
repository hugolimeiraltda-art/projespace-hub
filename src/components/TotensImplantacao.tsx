import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MODELOS = ['Totem 360', 'Totem Parede', 'Totem Mini'] as const;
type Modelo = typeof MODELOS[number];

interface Totem {
  id: string;
  project_id: string | null;
  customer_id: string | null;
  modelo: Modelo;
  cameras: number;
  codigo_alarme: string | null;
}

interface Props {
  projectId?: string;
  customerId?: string;
  onTotalsChange?: (totens: number, cameras: number) => void;
}

export function TotensImplantacao({ projectId, customerId, onTotalsChange }: Props) {
  const [totens, setTotens] = useState<Totem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newModelo, setNewModelo] = useState<Modelo>('Totem 360');
  const [newCameras, setNewCameras] = useState<number>(0);
  const [newCodigo, setNewCodigo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!projectId && !customerId) { setLoading(false); return; }
    setLoading(true);
    const base = supabase.from('implantacao_totens').select('*');
    const { data, error } = await (projectId
      ? base.eq('project_id', projectId)
      : base.eq('customer_id', customerId!)
    ).order('created_at', { ascending: true });
    if (error) {
      toast.error('Erro ao carregar totens', { description: error.message });
    } else {
      setTotens((data || []) as Totem[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId, customerId]);

  useEffect(() => {
    if (onTotalsChange) {
      const totalCam = totens.reduce((s, t) => s + (t.cameras || 0), 0);
      onTotalsChange(totens.length, totalCam);
    }
  }, [totens, onTotalsChange]);

  const handleSave = async () => {
    if (!newModelo) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('implantacao_totens')
      .insert({
        project_id: projectId ?? null,
        customer_id: projectId ? null : (customerId ?? null),
        modelo: newModelo,
        cameras: Math.max(0, Number(newCameras) || 0),
        codigo_alarme: newCodigo.trim() || null,
      })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar totem', { description: error.message });
      return;
    }
    setTotens(prev => [...prev, data as Totem]);
    setAdding(false);
    setNewModelo('Totem 360');
    setNewCameras(0);
    setNewCodigo('');
    toast.success('Totem adicionado');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('implantacao_totens').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover', { description: error.message });
      return;
    }
    setTotens(prev => prev.filter(t => t.id !== id));
  };

  const totalCameras = totens.reduce((s, t) => s + (t.cameras || 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cadastre cada totem físico individualmente. Clique no "+" para adicionar.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {totens.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground italic py-2">Nenhum totem cadastrado ainda.</p>
          )}

          {totens.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Modelo</th>
                    <th className="px-3 py-2 font-medium">Câmeras</th>
                    <th className="px-3 py-2 font-medium">Cód. de Alarme</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {totens.map((t, i) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{t.modelo}</td>
                      <td className="px-3 py-2">{t.cameras}</td>
                      <td className="px-3 py-2">{t.codigo_alarme || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adding ? (
            <div className="border rounded-md p-3 bg-muted/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Modelo de Totem</label>
                  <Select value={newModelo} onValueChange={(v) => setNewModelo(v as Modelo)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Qtd de câmeras</label>
                  <Input
                    type="number"
                    min={0}
                    value={newCameras}
                    onChange={(e) => setNewCameras(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Cód. de Alarme</label>
                  <Input
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                    placeholder="Ex: 5405"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Salvar Totem
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Totem
            </Button>
          )}

          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 pt-1">
            <span>Total totens: <span className="font-semibold text-foreground">{totens.length}</span></span>
            <span>Total câmeras: <span className="font-semibold text-foreground">{totalCameras}</span></span>
          </div>
        </>
      )}
    </div>
  );
}
