import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, ClipboardCheck, BarChart3, AlertTriangle, RefreshCw, Users, TrendingUp, Pencil, Save, Plus, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Users,
  TrendingUp,
};

interface Politica {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  itens: string[];
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
}

export default function SucessoClientePoliticaCS() {
  const { user } = useAuth();
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItens, setEditItens] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchPoliticas = async () => {
    const { data, error } = await supabase
      .from('cs_politicas')
      .select('*')
      .order('id');

    if (error) {
      toast.error('Erro ao carregar políticas');
      return;
    }

    setPoliticas((data || []).map(d => ({
      ...d,
      itens: Array.isArray(d.itens) ? d.itens as string[] : JSON.parse(d.itens as string),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPoliticas(); }, []);

  const startEdit = (politica: Politica) => {
    setEditingId(politica.id);
    setEditItens([...politica.itens]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditItens([]);
  };

  const handleSave = async (politicaId: string) => {
    setSaving(true);
    const userName = (user as any)?.user_metadata?.nome || (user as any)?.user_metadata?.name || user?.email || '';

    const { error } = await supabase
      .from('cs_politicas')
      .update({
        itens: editItens as any,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
        updated_by_name: userName,
      })
      .eq('id', politicaId);

    setSaving(false);

    if (error) {
      toast.error('Erro ao salvar política');
      return;
    }

    toast.success('Política atualizada com sucesso');
    setEditingId(null);
    fetchPoliticas();
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...editItens];
    updated[index] = value;
    setEditItens(updated);
  };

  const removeItem = (index: number) => {
    setEditItens(editItens.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setEditItens([...editItens, '']);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Política de CS</h1>
            <p className="text-muted-foreground">Diretrizes e políticas do Sucesso do Cliente</p>
          </div>
        </div>

        <div className="grid gap-6">
          {politicas.map((politica) => {
            const Icon = iconMap[politica.icone] || ClipboardCheck;
            const isEditing = editingId === politica.id;

            return (
              <Card key={politica.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{politica.titulo}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{politica.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(politica)}>
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={() => handleSave(politica.id)} disabled={saving}>
                            <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {politica.updated_by_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 ml-12">
                      <Clock className="w-3 h-3" />
                      Última edição: {formatDate(politica.updated_at)} por {politica.updated_by_name}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-2">
                      {editItens.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}.</span>
                          <Input
                            value={item}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            className="flex-1"
                          />
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeItem(idx)}>
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                        <Plus className="w-4 h-4 mr-1" /> Adicionar item
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {politica.itens.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
