import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Eye, EyeOff, Network, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Equipamento {
  id: string;
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
  { key: 'equipamento', label: 'Equipamento', width: 'min-w-[220px]' },
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
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [links, setLinks] = useState<LinkInternet[]>([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const load = async () => {
    setLoading(true);
    const [eq, lk] = await Promise.all([
      supabase.from('customer_rede_equipamentos').select('*').eq('customer_id', customerId).order('ordem'),
      supabase.from('customer_rede_links').select('*').eq('customer_id', customerId).order('ordem'),
    ]);
    setEquipamentos((eq.data as Equipamento[]) || []);
    setLinks((lk.data as LinkInternet[]) || []);
    setLoading(false);
  };

  const addEquipamento = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('customer_rede_equipamentos')
      .insert({ customer_id: customerId, equipamento: 'Novo equipamento', ordem: equipamentos.length })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setEquipamentos((prev) => [...prev, data as Equipamento]);
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
          {canEdit && (
            <Button size="sm" onClick={addEquipamento} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Equipamento
            </Button>
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
                        <tr key={row.id}>
                          {EQUIP_COLS.map((c) => (
                            <td key={c.key} className="border p-1">
                              <Input
                                className="h-8 border-0 shadow-none focus-visible:ring-1"
                                type={isSecret(c.key as string) && !showSecrets ? 'password' : 'text'}
                                defaultValue={(row[c.key] as string) || ''}
                                disabled={!canEdit}
                                onBlur={(e) => saveEquipamento(row, c.key, e.target.value)}
                              />
                            </td>
                          ))}
                          {canEdit && (
                            <td className="border p-1 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive h-8 w-8"
                                onClick={() => removeEquipamento(row.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Links de Internet</h3>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={addLink} disabled={saving}>
                    <Plus className="w-4 h-4 mr-2" /> Link
                  </Button>
                )}
              </div>
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
