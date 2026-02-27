import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, ChevronRight, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type PropostaItem = {
  nome: string;
  codigo?: string;
  qtd: number;
  valor_locacao: number;
  valor_instalacao: number;
  desconto?: number;
};

type ItensData = {
  kits: PropostaItem[];
  avulsos: PropostaItem[];
  aproveitados: PropostaItem[];
  servicos: PropostaItem[];
  mensalidade_total: number;
  taxa_conexao_total: number;
};

interface Props {
  sessaoId: string;
}

export default function EquipamentosPrecos({ sessaoId }: Props) {
  const [itens, setItens] = useState<ItensData | null>(null);
  const [itensExpandidos, setItensExpandidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const { data: sessao } = await supabase
          .from('orcamento_sessoes')
          .select('proposta_gerada')
          .eq('id', sessaoId)
          .single();

        if (sessao?.proposta_gerada) {
          let parsed: any;
          try { parsed = JSON.parse(sessao.proposta_gerada); } catch { parsed = null; }
          if (parsed?.itens) {
            setItens(parsed.itens);
            setItensExpandidos(parsed.itensExpandidos || []);
          }
        }
      } catch (e) {
        console.error('Error loading equipment data:', e);
      }
      setLoading(false);
    })();
  }, [sessaoId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-3 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando equipamentos...</span>
      </div>
    );
  }

  if (!itens) return null;

  const allItems = [
    ...(itens.kits || []),
    ...(itens.avulsos || []),
    ...(itens.aproveitados || []),
    ...(itens.servicos || []),
  ];

  if (allItems.length === 0) return null;

  const totalMensalidade = allItems.reduce((sum, i) => sum + (i.valor_locacao || 0) * i.qtd, 0);
  const totalInstalacao = allItems.reduce((sum, i) => sum + (i.valor_instalacao || 0) * i.qtd, 0);
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const toggleKit = (key: string) => {
    setExpandedKits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getKitComponents = (kitNome: string) => {
    if (!itensExpandidos) return [];
    return itensExpandidos.filter((item: any) => item.origem === `Kit: ${kitNome}`);
  };

  const groups = [
    { label: 'Kits', badge: <Badge variant="default" className="bg-primary text-primary-foreground">Kits</Badge>, items: itens.kits },
    { label: 'Avulsos', badge: <Badge variant="secondary">Itens Avulsos</Badge>, items: itens.avulsos },
    { label: 'Aproveitados', badge: <Badge className="bg-accent text-accent-foreground">Aproveitados (50%)</Badge>, items: itens.aproveitados },
    { label: 'Servicos', badge: <Badge variant="outline">Serviços</Badge>, items: itens.servicos },
  ].filter(g => g.items && g.items.length > 0);

  return (
    <div className="border-t bg-card">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Lista de Equipamentos e Preços</span>
          <Badge variant="secondary" className="text-xs">{allItems.length} itens</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {groups.map((group) => (
            <Card key={group.label} className={group.label === 'Aproveitados' ? 'border-accent/30' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {group.badge}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5 pr-2 w-10 font-medium text-xs">Qtd</th>
                        <th className="text-left py-1.5 pr-2 font-medium text-xs">Descrição</th>
                        <th className="text-left py-1.5 pr-2 w-16 font-medium text-xs">Código</th>
                        <th className="text-right py-1.5 pl-2 w-24 font-medium text-xs">Locação</th>
                        <th className="text-right py-1.5 pl-2 w-24 font-medium text-xs">Instalação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items!.map((item, i) => {
                        const isKit = group.label === 'Kits';
                        const kitComponents = isKit ? getKitComponents(item.nome) : [];
                        const hasComponents = kitComponents.length > 0;
                        const key = `${group.label}-${i}`;
                        const isExpanded = expandedKits.has(key);
                        return (
                          <> 
                            <tr
                              key={key}
                              className={`border-b last:border-0 ${isKit && hasComponents ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                              onClick={() => isKit && hasComponents && toggleKit(key)}
                            >
                              <td className="py-1.5 pr-2 text-xs">
                                <div className="flex items-center gap-1">
                                  {isKit && hasComponents && (
                                    isExpanded
                                      ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                      : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {item.qtd}
                                </div>
                              </td>
                              <td className="py-1.5 pr-2 text-xs font-medium truncate" title={item.nome}>{item.nome}</td>
                              <td className="py-1.5 pr-2 text-xs text-muted-foreground">{item.codigo || '-'}</td>
                              <td className="py-1.5 pl-2 text-right text-xs whitespace-nowrap">{formatBRL((item.valor_locacao || 0) * item.qtd)}</td>
                              <td className="py-1.5 pl-2 text-right text-xs whitespace-nowrap">{formatBRL((item.valor_instalacao || 0) * item.qtd)}</td>
                            </tr>
                            {isKit && isExpanded && kitComponents.map((comp: any, ci: number) => (
                              <tr key={`${key}-comp-${ci}`} className="border-b last:border-0 bg-muted/30">
                                <td className="py-1 pr-2 pl-5 text-[11px] text-muted-foreground">{comp.qtd}</td>
                                <td className="py-1 pr-2 text-[11px] text-muted-foreground truncate" title={comp.nome}>↳ {comp.nome}</td>
                                <td className="py-1 pr-2 text-[11px] text-muted-foreground">{comp.codigo || '-'}</td>
                                <td className="py-1 pl-2 text-right text-[11px] text-muted-foreground whitespace-nowrap">{formatBRL((comp.valor_locacao || 0) * comp.qtd)}</td>
                                <td className="py-1 pl-2 text-right text-[11px] text-muted-foreground whitespace-nowrap">{formatBRL((comp.valor_instalacao || 0) * comp.qtd)}</td>
                              </tr>
                            ))}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Totals */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatBRL(itens.mensalidade_total || totalMensalidade)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                </div>
                <Separator orientation="vertical" className="hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Instalação</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatBRL(itens.taxa_conexao_total || totalInstalacao)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">até 10x de {formatBRL((itens.taxa_conexao_total || totalInstalacao) / 10)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
