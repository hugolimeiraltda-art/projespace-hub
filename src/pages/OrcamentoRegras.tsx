import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw, Percent, Wrench } from 'lucide-react';

interface Regra {
  id: string;
  campo: string;
  percentual: number;
  base_campo: string;
  descricao: string | null;
}

const CAMPO_LABELS: Record<string, string> = {
  valor_minimo: 'Valor Mínimo',
  valor_locacao: 'Valor Locação',
  valor_minimo_locacao: 'Valor Mín. Locação',
  valor_instalacao: 'Valor Instalação',
  servico_valor_minimo: 'Valor Mínimo',
  servico_valor_locacao: 'Valor Locação',
};

const BASE_LABELS: Record<string, string> = {
  preco_unitario: 'Valor Atual',
  valor_locacao: 'Valor Locação',
};

const PRODUTO_CAMPOS = ['valor_minimo', 'valor_locacao', 'valor_minimo_locacao', 'valor_instalacao'];
const SERVICO_CAMPOS = ['servico_valor_minimo', 'servico_valor_locacao'];

export default function OrcamentoRegras() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => { fetchRegras(); }, []);

  const fetchRegras = async () => {
    const { data, error } = await supabase
      .from('orcamento_regras_precificacao')
      .select('*')
      .order('campo');
    if (error) {
      toast({ title: 'Erro ao carregar regras', description: error.message, variant: 'destructive' });
    } else {
      setRegras(data || []);
      const vals: Record<string, string> = {};
      (data || []).forEach(r => { vals[r.id] = String(r.percentual); });
      setEditValues(vals);
    }
    setLoading(false);
  };

  const regrasProduto = regras.filter(r => PRODUTO_CAMPOS.includes(r.campo));
  const regrasServico = regras.filter(r => SERVICO_CAMPOS.includes(r.campo));

  const saveRegras = async () => {
    setSaving(true);
    try {
      for (const regra of regras) {
        const newPercentual = parseFloat(editValues[regra.id] || '0');
        if (isNaN(newPercentual) || newPercentual <= 0) {
          toast({ title: 'Valor inválido', description: `Percentual de ${CAMPO_LABELS[regra.campo]} deve ser maior que zero.`, variant: 'destructive' });
          setSaving(false);
          return;
        }
        await supabase
          .from('orcamento_regras_precificacao')
          .update({ percentual: newPercentual, updated_at: new Date().toISOString() })
          .eq('id', regra.id);
      }
      toast({ title: 'Regras salvas com sucesso!' });
      fetchRegras();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const aplicarRegras = async () => {
    setApplying(true);
    try {
      const { data: currentRegras } = await supabase.from('orcamento_regras_precificacao').select('*');
      if (!currentRegras) throw new Error('Sem regras');

      const regraMap: Record<string, Regra> = {};
      currentRegras.forEach(r => { regraMap[r.campo] = r; });

      const valMinPct = (regraMap['valor_minimo']?.percentual || 90) / 100;
      const valLocPct = (regraMap['valor_locacao']?.percentual || 3.57) / 100;
      const valMinLocPct = (regraMap['valor_minimo_locacao']?.percentual || 90) / 100;
      const valInstPct = (regraMap['valor_instalacao']?.percentual || 10) / 100;
      const svcMinPct = (regraMap['servico_valor_minimo']?.percentual || 90) / 100;
      const svcLocPct = (regraMap['servico_valor_locacao']?.percentual || 3.57) / 100;

      const { data: produtos } = await supabase.from('orcamento_produtos').select('id, preco_unitario, subgrupo').gt('preco_unitario', 0);
      if (!produtos || produtos.length === 0) {
        toast({ title: 'Nenhum produto com valor atual > 0' });
        setApplying(false);
        return;
      }

      let updated = 0;
      for (const p of produtos) {
        const va = Number(p.preco_unitario);
        const isServico = p.subgrupo === 'Serviço';

        if (isServico) {
          await supabase.from('orcamento_produtos').update({
            valor_minimo: parseFloat((va * svcMinPct).toFixed(2)),
            valor_locacao: parseFloat((va * svcLocPct).toFixed(2)),
            valor_minimo_locacao: 0,
            valor_instalacao: 0,
            updated_at: new Date().toISOString(),
          }).eq('id', p.id);
        } else {
          const locacao = va * valLocPct;
          await supabase.from('orcamento_produtos').update({
            valor_minimo: parseFloat((va * valMinPct).toFixed(2)),
            valor_locacao: parseFloat(locacao.toFixed(2)),
            valor_minimo_locacao: parseFloat((locacao * valMinLocPct).toFixed(2)),
            valor_instalacao: parseFloat((va * valInstPct).toFixed(2)),
            updated_at: new Date().toISOString(),
          }).eq('id', p.id);
        }
        updated++;
      }

      toast({ title: `${updated} produtos atualizados com as novas regras!` });
    } catch (err: any) {
      toast({ title: 'Erro ao aplicar regras', description: err.message, variant: 'destructive' });
    }
    setApplying(false);
  };

  const previewValue = 1000;

  const getProdutoPreview = () => {
    const valMin = parseFloat(editValues[regrasProduto.find(r => r.campo === 'valor_minimo')?.id || ''] || '0') / 100;
    const valLoc = parseFloat(editValues[regrasProduto.find(r => r.campo === 'valor_locacao')?.id || ''] || '0') / 100;
    const valMinLoc = parseFloat(editValues[regrasProduto.find(r => r.campo === 'valor_minimo_locacao')?.id || ''] || '0') / 100;
    const valInst = parseFloat(editValues[regrasProduto.find(r => r.campo === 'valor_instalacao')?.id || ''] || '0') / 100;
    const locacao = previewValue * valLoc;
    return {
      valor_minimo: (previewValue * valMin).toFixed(2),
      valor_locacao: locacao.toFixed(2),
      valor_minimo_locacao: (locacao * valMinLoc).toFixed(2),
      valor_instalacao: (previewValue * valInst).toFixed(2),
    };
  };

  const getServicoPreview = () => {
    const valMin = parseFloat(editValues[regrasServico.find(r => r.campo === 'servico_valor_minimo')?.id || ''] || '0') / 100;
    const valLoc = parseFloat(editValues[regrasServico.find(r => r.campo === 'servico_valor_locacao')?.id || ''] || '0') / 100;
    return {
      valor_minimo: (previewValue * valMin).toFixed(2),
      valor_locacao: (previewValue * valLoc).toFixed(2),
    };
  };

  const prodPreview = regrasProduto.length > 0 ? getProdutoPreview() : null;
  const svcPreview = regrasServico.length > 0 ? getServicoPreview() : null;

  const renderRegrasSection = (titulo: string, icon: React.ReactNode, desc: string, regrasList: Regra[]) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon} {titulo}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regrasList.map(regra => (
            <div key={regra.id} className="space-y-1">
              <Label className="text-sm font-medium">
                {CAMPO_LABELS[regra.campo] || regra.campo}
                <span className="text-xs text-muted-foreground ml-1">(% do {BASE_LABELS[regra.base_campo] || regra.base_campo})</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editValues[regra.id] || ''}
                  onChange={e => setEditValues(v => ({ ...v, [regra.id]: e.target.value }))}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regras de Precificação</h1>
          <p className="text-muted-foreground">Configure os percentuais usados para calcular automaticamente os preços.</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {renderRegrasSection(
              'Percentuais — Produtos',
              <Percent className="w-5 h-5" />,
              'Ao alterar o Valor Atual de um produto, os demais campos serão calculados com base nestas regras.',
              regrasProduto
            )}

            {prodPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Simulação Produto (Valor Atual = R$ {previewValue.toFixed(2)})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Valor Mínimo</p><p className="font-semibold">R$ {prodPreview.valor_minimo}</p></div>
                    <div><p className="text-muted-foreground">Valor Locação</p><p className="font-semibold">R$ {prodPreview.valor_locacao}</p></div>
                    <div><p className="text-muted-foreground">Valor Mín. Locação</p><p className="font-semibold">R$ {prodPreview.valor_minimo_locacao}</p></div>
                    <div><p className="text-muted-foreground">Valor Instalação</p><p className="font-semibold">R$ {prodPreview.valor_instalacao}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {renderRegrasSection(
              'Percentuais — Serviços',
              <Wrench className="w-5 h-5" />,
              'Regras aplicadas a itens com subgrupo "Serviço". Valor Mín. Locação e Instalação são sempre zero.',
              regrasServico
            )}

            {svcPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Simulação Serviço (Valor Atual = R$ {previewValue.toFixed(2)})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Valor Mínimo</p><p className="font-semibold">R$ {svcPreview.valor_minimo}</p></div>
                    <div><p className="text-muted-foreground">Valor Locação</p><p className="font-semibold">R$ {svcPreview.valor_locacao}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={saveRegras} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Regras'}
              </Button>
              <Button variant="outline" onClick={aplicarRegras} disabled={applying}>
                <RefreshCw className={cn('w-4 h-4 mr-2', applying && 'animate-spin')} />
                {applying ? 'Aplicando...' : 'Recalcular Todos os Produtos'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
