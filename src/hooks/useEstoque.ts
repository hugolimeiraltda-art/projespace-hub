import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EstoqueStatus, EstoqueTipo, LocalEstoque, EstoqueItem, Estoque } from '@/types/estoque';

export interface EstoqueItemAgrupado {
  id: string;
  codigo: string;
  modelo: string;
  estoques: Record<string, { id?: string; minimo: number; atual: number; status: EstoqueStatus }>;
  statusGeral: EstoqueStatus;
}

export interface EstoqueAlerta {
  id: string;
  item_id: string;
  local_estoque_id: string;
  estoque_minimo: number;
  estoque_atual: number;
  quantidade_faltante: number;
  lido: boolean;
  created_at: string;
  // Joined data
  item_codigo?: string;
  item_modelo?: string;
  local_nome?: string;
}

export interface ItemReposicao {
  codigo: string;
  modelo: string;
  local: string;
  cidade: string;
  tipo: string;
  estoque_minimo: number;
  estoque_atual: number;
  quantidade_comprar: number;
}

export function useEstoque() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [locais, setLocais] = useState<LocalEstoque[]>([]);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [alertas, setAlertas] = useState<EstoqueAlerta[]>([]);
  const [alertasNaoLidos, setAlertasNaoLidos] = useState(0);

  // Filters
  const [filterCidade, setFilterCidade] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [itemsRes, locaisRes, estoquesRes, alertasRes] = await Promise.all([
        supabase.from('estoque_itens').select('*').order('modelo'),
        supabase.from('locais_estoque').select('*').order('cidade, tipo'),
        supabase.from('estoque').select('*'),
        supabase.from('estoque_alertas').select('*').order('created_at', { ascending: false }),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (locaisRes.error) throw locaisRes.error;
      if (estoquesRes.error) throw estoquesRes.error;
      // Alertas might fail if user doesn't have permission, that's ok
      
      setItems(itemsRes.data || []);
      setLocais((locaisRes.data || []) as LocalEstoque[]);
      setEstoques(estoquesRes.data || []);
      
      if (!alertasRes.error && alertasRes.data) {
        // Enrich alerts with item and local info
        const enrichedAlertas = alertasRes.data.map(alerta => {
          const item = itemsRes.data?.find(i => i.id === alerta.item_id);
          const local = locaisRes.data?.find(l => l.id === alerta.local_estoque_id) as LocalEstoque | undefined;
          return {
            ...alerta,
            item_codigo: item?.codigo,
            item_modelo: item?.modelo,
            local_nome: local?.nome_local,
          };
        });
        setAlertas(enrichedAlertas);
        setAlertasNaoLidos(enrichedAlertas.filter(a => !a.lido).length);
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de estoque.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update stock atual value
  const updateEstoqueAtual = async (itemId: string, localId: string, novoValor: number): Promise<boolean> => {
    try {
      // Check if estoque record exists
      const existingEstoque = estoques.find(
        e => e.item_id === itemId && e.local_estoque_id === localId
      );

      if (existingEstoque) {
        // Update existing record
        const { error } = await supabase
          .from('estoque')
          .update({ estoque_atual: novoValor })
          .eq('id', existingEstoque.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('estoque')
          .insert({
            item_id: itemId,
            local_estoque_id: localId,
            estoque_atual: novoValor,
            estoque_minimo: 0,
          });

        if (error) throw error;
      }

      // Reload to get updated alerts
      await loadData();

      toast({
        title: 'Estoque atualizado',
        description: 'O valor do estoque atual foi atualizado com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o estoque.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Create new product and add to all stock locations
  const createProduct = async (codigo: string, modelo: string): Promise<boolean> => {
    try {
      // Check if codigo already exists
      const existing = items.find(i => i.codigo === codigo);
      if (existing) {
        toast({
          title: 'Código já existe',
          description: 'Já existe um produto com este código.',
          variant: 'destructive',
        });
        return false;
      }

      // Create the product
      const { data: newItem, error: itemError } = await supabase
        .from('estoque_itens')
        .insert({ codigo, modelo })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create estoque entries for all locations with default values
      if (newItem && locais.length > 0) {
        const estoqueEntries = locais.map(local => ({
          item_id: newItem.id,
          local_estoque_id: local.id,
          estoque_atual: 0,
          estoque_minimo: 0,
        }));

        const { error: estoqueError } = await supabase
          .from('estoque')
          .insert(estoqueEntries);

        if (estoqueError) {
          console.error('Error creating stock entries:', estoqueError);
          // Product was created but stock entries failed - still reload
        }
      }

      toast({
        title: 'Produto criado',
        description: 'O novo produto foi adicionado a todos os estoques.',
      });

      await loadData();
      return true;
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Erro ao criar produto',
        description: 'Não foi possível criar o produto.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Mark alert as read
  const marcarAlertaLido = async (alertaId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('estoque_alertas')
        .update({ 
          lido: true,
          lido_em: new Date().toISOString()
        })
        .eq('id', alertaId);

      if (error) throw error;

      setAlertas(prev => prev.map(a => 
        a.id === alertaId ? { ...a, lido: true } : a
      ));
      setAlertasNaoLidos(prev => Math.max(0, prev - 1));

      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  };

  // Mark all alerts as read
  const marcarTodosAlertasLidos = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('estoque_alertas')
        .update({ 
          lido: true,
          lido_em: new Date().toISOString()
        })
        .eq('lido', false);

      if (error) throw error;

      setAlertas(prev => prev.map(a => ({ ...a, lido: true })));
      setAlertasNaoLidos(0);

      toast({
        title: 'Alertas marcados como lidos',
        description: 'Todos os alertas foram marcados como lidos.',
      });

      return true;
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      return false;
    }
  };

  // Filter locais by cidade and tipo
  const locaisFiltrados = useMemo(() => {
    return locais.filter(local => {
      if (filterCidade && local.cidade !== filterCidade) return false;
      if (filterTipo && local.tipo !== filterTipo) return false;
      return true;
    });
  }, [locais, filterCidade, filterTipo]);

  // Compute items with stock per local
  const itensAgrupados = useMemo(() => {
    const result: EstoqueItemAgrupado[] = [];

    for (const item of items) {
      const estoquesPorLocal: Record<string, { id?: string; minimo: number; atual: number; status: EstoqueStatus }> = {};
      let temCritico = false;
      let temOk = false;
      let temBase = false;

      for (const local of locais) {
        const estoque = estoques.find(
          e => e.item_id === item.id && e.local_estoque_id === local.id
        );

        if (estoque) {
          temBase = true;
          const status: EstoqueStatus = estoque.estoque_atual < estoque.estoque_minimo ? 'CRITICO' : 'OK';
          if (status === 'CRITICO') temCritico = true;
          if (status === 'OK') temOk = true;
          
          estoquesPorLocal[local.id] = {
            id: estoque.id,
            minimo: estoque.estoque_minimo,
            atual: estoque.estoque_atual,
            status,
          };
        } else {
          estoquesPorLocal[local.id] = {
            minimo: 0,
            atual: 0,
            status: 'SEM_BASE',
          };
        }
      }

      // Determine general status
      let statusGeral: EstoqueStatus = 'SEM_BASE';
      if (temBase) {
        statusGeral = temCritico ? 'CRITICO' : 'OK';
      }

      result.push({
        id: item.id,
        codigo: item.codigo,
        modelo: item.modelo,
        estoques: estoquesPorLocal,
        statusGeral,
      });
    }

    return result;
  }, [items, locais, estoques]);

  // Apply filters
  const filteredData = useMemo(() => {
    return itensAgrupados.filter(item => {
      // Status filter - check status in filtered locais
      if (filterStatus) {
        const locaisParaVerificar = locaisFiltrados.length > 0 ? locaisFiltrados : locais;
        const statusNosLocais = locaisParaVerificar.map(l => item.estoques[l.id]?.status);
        
        if (filterStatus === 'CRITICO') {
          if (!statusNosLocais.includes('CRITICO')) return false;
        } else if (filterStatus === 'OK') {
          if (!statusNosLocais.includes('OK')) return false;
        } else if (filterStatus === 'SEM_BASE') {
          // Only show if all filtered locais are SEM_BASE
          if (!statusNosLocais.every(s => s === 'SEM_BASE')) return false;
        }
      }

      // Search term (codigo or modelo)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesCodigo = item.codigo.toLowerCase().includes(search);
        const matchesModelo = item.modelo.toLowerCase().includes(search);
        if (!matchesCodigo && !matchesModelo) return false;
      }

      return true;
    });
  }, [itensAgrupados, locaisFiltrados, locais, filterStatus, searchTerm]);

  // Get unique cities from locais
  const cidades = useMemo(() => {
    return [...new Set(locais.map(l => l.cidade))];
  }, [locais]);

  // Get unique tipos from locais
  const tipos = useMemo(() => {
    return [...new Set(locais.map(l => l.tipo))];
  }, [locais]);

  // Get critical items for export
  const criticalItems = useMemo(() => {
    return filteredData.filter(item => {
      const locaisParaVerificar = locaisFiltrados.length > 0 ? locaisFiltrados : locais;
      return locaisParaVerificar.some(l => item.estoques[l.id]?.status === 'CRITICO');
    });
  }, [filteredData, locaisFiltrados, locais]);

  // Get items for purchase report (all items where atual < minimo)
  const itensParaCompra = useMemo((): ItemReposicao[] => {
    const result: ItemReposicao[] = [];

    for (const item of items) {
      for (const local of locais) {
        const estoque = estoques.find(
          e => e.item_id === item.id && e.local_estoque_id === local.id
        );

        if (estoque && estoque.estoque_atual < estoque.estoque_minimo) {
          result.push({
            codigo: item.codigo,
            modelo: item.modelo,
            local: local.nome_local,
            cidade: local.cidade,
            tipo: local.tipo,
            estoque_minimo: estoque.estoque_minimo,
            estoque_atual: estoque.estoque_atual,
            quantidade_comprar: estoque.estoque_minimo - estoque.estoque_atual,
          });
        }
      }
    }

    // Sort by quantity to buy (descending)
    return result.sort((a, b) => b.quantidade_comprar - a.quantidade_comprar);
  }, [items, locais, estoques]);

  // Stats - count unique items
  const stats = useMemo(() => {
    const total = items.length;
    let ok = 0;
    let critico = 0;
    let semBase = 0;

    for (const item of itensAgrupados) {
      // Check all locais for this item
      const statusList = locais.map(l => item.estoques[l.id]?.status);
      const temEstoque = statusList.some(s => s && s !== 'SEM_BASE');
      
      if (!temEstoque) {
        semBase++;
      } else if (statusList.includes('CRITICO')) {
        critico++;
      } else {
        ok++;
      }
    }
    
    return { total, ok, critico, semBase };
  }, [items, itensAgrupados, locais]);

  return {
    isLoading,
    filteredData,
    criticalItems,
    itensParaCompra,
    alertas,
    alertasNaoLidos,
    locais,
    locaisFiltrados,
    cidades,
    tipos,
    stats,
    filterCidade,
    setFilterCidade,
    filterTipo,
    setFilterTipo,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    refresh: loadData,
    updateEstoqueAtual,
    createProduct,
    marcarAlertaLido,
    marcarTodosAlertasLidos,
  };
}