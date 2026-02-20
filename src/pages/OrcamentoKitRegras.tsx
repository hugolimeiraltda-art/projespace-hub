import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Search, X, Tag, FileText, Cog, ChevronDown, ChevronRight } from 'lucide-react';

interface KitRegra {
  id: string;
  id_kit: number | null;
  codigo: string | null;
  nome: string;
  categoria: string;
  descricao_uso: string | null;
  palavras_chave: string[] | null;
  regras_condicionais: any[] | null;
}

const CAMPOS_CONDICIONAIS = [
  { value: 'tipo_portao', label: 'Tipo de Portão', opcoes: ['deslizante', 'pivotante', 'pivotante_duplo', 'basculante', 'guilhotina'] },
  { value: 'tipo_porta', label: 'Tipo de Porta', opcoes: ['pedestre_rua', 'pedestre_bloco', 'eclusa'] },
  { value: 'tipo_produto', label: 'Modalidade', opcoes: ['digital', 'remota', 'assistida', 'expressa'] },
  { value: 'tipo_cftv', label: 'Tipo de CFTV', opcoes: ['analogico', 'ip', 'novo'] },
  { value: 'tipo_alarme', label: 'Tipo de Alarme', opcoes: ['iva', 'cerca_eletrica', 'nenhum'] },
  { value: 'tipo_interfonia', label: 'Tipo de Interfonia', opcoes: ['hibrida', 'digital'] },
  { value: 'tem_cancela', label: 'Tem Cancela', opcoes: ['sim', 'nao'] },
  { value: 'tem_catraca', label: 'Tem Catraca', opcoes: ['sim', 'nao'] },
  { value: 'tem_totem', label: 'Tem Totem', opcoes: ['sim', 'nao'] },
];

export default function OrcamentoKitRegras() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<KitRegra>>({});
  const [newTag, setNewTag] = useState('');
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());

  const { data: kits, isLoading } = useQuery({
    queryKey: ['kits-regras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_kits')
        .select('id, id_kit, codigo, nome, categoria, descricao_uso, palavras_chave, regras_condicionais')
        .eq('ativo', true)
        .order('categoria')
        .order('nome');
      if (error) throw error;
      return data as KitRegra[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; descricao_uso: string | null; palavras_chave: string[]; regras_condicionais: any[] }) => {
      const { error } = await supabase
        .from('orcamento_kits')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits-regras'] });
      toast.success('Regras do kit atualizadas!');
      setEditingId(null);
      setEditData({});
    },
    onError: () => toast.error('Erro ao salvar regras'),
  });

  const startEdit = (kit: KitRegra) => {
    setEditingId(kit.id);
    setEditData({
      descricao_uso: kit.descricao_uso || '',
      palavras_chave: kit.palavras_chave || [],
      regras_condicionais: kit.regras_condicionais || [],
    });
    setExpandedKits(prev => new Set([...prev, kit.id]));
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      descricao_uso: editData.descricao_uso || null,
      palavras_chave: (editData.palavras_chave as string[]) || [],
      regras_condicionais: (editData.regras_condicionais as any[]) || [],
    });
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    const current = (editData.palavras_chave as string[]) || [];
    if (!current.includes(tag)) {
      setEditData({ ...editData, palavras_chave: [...current, tag] });
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    const current = (editData.palavras_chave as string[]) || [];
    setEditData({ ...editData, palavras_chave: current.filter(t => t !== tag) });
  };

  const addRegra = () => {
    const current = (editData.regras_condicionais as any[]) || [];
    setEditData({
      ...editData,
      regras_condicionais: [...current, { campo: 'tipo_portao', valor: '', condicao: 'igual' }],
    });
  };

  const updateRegra = (index: number, field: string, value: string) => {
    const current = [...((editData.regras_condicionais as any[]) || [])];
    current[index] = { ...current[index], [field]: value };
    setEditData({ ...editData, regras_condicionais: current });
  };

  const removeRegra = (index: number) => {
    const current = [...((editData.regras_condicionais as any[]) || [])];
    current.splice(index, 1);
    setEditData({ ...editData, regras_condicionais: current });
  };

  const toggleExpand = (id: string) => {
    setExpandedKits(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredKits = kits?.filter(k =>
    !search || k.nome.toLowerCase().includes(search.toLowerCase()) ||
    k.categoria.toLowerCase().includes(search.toLowerCase()) ||
    k.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedKits = filteredKits?.reduce((acc, kit) => {
    if (!acc[kit.categoria]) acc[kit.categoria] = [];
    acc[kit.categoria].push(kit);
    return acc;
  }, {} as Record<string, KitRegra[]>);

  const hasRules = (kit: KitRegra) =>
    kit.descricao_uso || (kit.palavras_chave && kit.palavras_chave.length > 0) || (kit.regras_condicionais && (kit.regras_condicionais as any[]).length > 0);

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Regras de Uso dos Kits</h1>
            <p className="text-muted-foreground text-sm">Configure quando cada kit deve ser sugerido pela IA nas propostas</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar kit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {groupedKits && Object.entries(groupedKits).map(([categoria, kitsGrupo]) => (
              <div key={categoria}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Cog className="h-5 w-5 text-primary" />
                  {categoria}
                  <Badge variant="secondary" className="ml-2">{kitsGrupo.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {kitsGrupo.map(kit => {
                    const isEditing = editingId === kit.id;
                    const isExpanded = expandedKits.has(kit.id);

                    return (
                      <Card key={kit.id} className={isEditing ? 'border-primary' : ''}>
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => !isEditing && toggleExpand(kit.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded || isEditing ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {kit.id_kit && <Badge variant="outline" className="text-xs shrink-0">#{kit.id_kit}</Badge>}
                                {kit.codigo && <Badge variant="secondary" className="text-xs shrink-0">{kit.codigo}</Badge>}
                                <span className="font-medium truncate">{kit.nome}</span>
                              </div>
                              {!isExpanded && !isEditing && hasRules(kit) && (
                                <div className="flex items-center gap-1 mt-1">
                                  {kit.descricao_uso && <FileText className="h-3 w-3 text-green-500" />}
                                  {kit.palavras_chave && kit.palavras_chave.length > 0 && <Tag className="h-3 w-3 text-blue-500" />}
                                  {kit.regras_condicionais && (kit.regras_condicionais as any[]).length > 0 && <Cog className="h-3 w-3 text-orange-500" />}
                                  <span className="text-xs text-muted-foreground">Configurado</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isEditing && (
                              <Button
                                size="sm"
                                variant={hasRules(kit) ? 'outline' : 'default'}
                                onClick={e => { e.stopPropagation(); startEdit(kit); }}
                              >
                                {hasRules(kit) ? 'Editar' : 'Configurar'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {(isExpanded || isEditing) && (
                          <CardContent className="pt-0 pb-4 space-y-4">
                            {/* Descrição de uso */}
                            <div>
                              <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                                <FileText className="h-4 w-4 text-green-600" />
                                Descrição de Uso / Cenário
                              </label>
                              {isEditing ? (
                                <Textarea
                                  value={(editData.descricao_uso as string) || ''}
                                  onChange={e => setEditData({ ...editData, descricao_uso: e.target.value })}
                                  placeholder="Ex: Usar quando o condomínio tem portão pivotante simples (1 folha). Inclui motor, placa, controles e instalação."
                                  rows={3}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{kit.descricao_uso || 'Não configurado'}</p>
                              )}
                            </div>

                            {/* Palavras-chave */}
                            <div>
                              <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                                <Tag className="h-4 w-4 text-blue-600" />
                                Palavras-chave (match automático)
                              </label>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {(isEditing ? (editData.palavras_chave as string[]) : kit.palavras_chave)?.map(tag => (
                                  <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    {isEditing && (
                                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                                    )}
                                  </Badge>
                                ))}
                                {!isEditing && (!kit.palavras_chave || kit.palavras_chave.length === 0) && (
                                  <span className="text-sm text-muted-foreground">Nenhuma</span>
                                )}
                              </div>
                              {isEditing && (
                                <div className="flex gap-2">
                                  <Input
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Adicionar tag..."
                                    className="max-w-xs"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                  />
                                  <Button size="sm" variant="outline" onClick={addTag}>Adicionar</Button>
                                </div>
                              )}
                            </div>

                            {/* Regras condicionais */}
                            <div>
                              <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                                <Cog className="h-4 w-4 text-orange-600" />
                                Regras Condicionais
                              </label>
                              {isEditing ? (
                                <div className="space-y-2">
                                  {((editData.regras_condicionais as any[]) || []).map((regra, i) => {
                                    const campoConfig = CAMPOS_CONDICIONAIS.find(c => c.value === regra.campo);
                                    return (
                                      <div key={i} className="flex items-center gap-2 flex-wrap bg-muted/50 p-2 rounded-md">
                                        <span className="text-sm">Se</span>
                                        <select
                                          className="border rounded px-2 py-1 text-sm bg-background"
                                          value={regra.campo}
                                          onChange={e => updateRegra(i, 'campo', e.target.value)}
                                        >
                                          {CAMPOS_CONDICIONAIS.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                          ))}
                                        </select>
                                        <span className="text-sm">=</span>
                                        <select
                                          className="border rounded px-2 py-1 text-sm bg-background"
                                          value={regra.valor}
                                          onChange={e => updateRegra(i, 'valor', e.target.value)}
                                        >
                                          <option value="">Selecione...</option>
                                          {campoConfig?.opcoes.map(o => (
                                            <option key={o} value={o}>{o}</option>
                                          ))}
                                        </select>
                                        <Button size="sm" variant="ghost" onClick={() => removeRegra(i)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  <Button size="sm" variant="outline" onClick={addRegra}>+ Adicionar Regra</Button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {kit.regras_condicionais && (kit.regras_condicionais as any[]).length > 0 ? (
                                    (kit.regras_condicionais as any[]).map((r: any, i: number) => {
                                      const campoLabel = CAMPOS_CONDICIONAIS.find(c => c.value === r.campo)?.label || r.campo;
                                      return (
                                        <p key={i} className="text-sm text-muted-foreground">
                                          Se <strong>{campoLabel}</strong> = <strong>{r.valor}</strong>
                                        </p>
                                      );
                                    })
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Nenhuma</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {isEditing && (
                              <div className="flex gap-2 pt-2 border-t">
                                <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                                  <Save className="h-4 w-4 mr-1.5" />
                                  Salvar
                                </Button>
                                <Button variant="outline" onClick={() => { setEditingId(null); setEditData({}); }}>
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
