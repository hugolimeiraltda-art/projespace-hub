import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EstoqueView, EstoqueStatus, EstoqueTipo, LocalEstoque, EstoqueItem, Estoque } from '@/types/estoque';

export function useEstoque() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [locais, setLocais] = useState<LocalEstoque[]>([]);
  const [estoques, setEstoques] = useState<Estoque[]>([]);

  // Filters
  const [filterCidade, setFilterCidade] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [itemsRes, locaisRes, estoquesRes] = await Promise.all([
        supabase.from('estoque_itens').select('*').order('modelo'),
        supabase.from('locais_estoque').select('*').order('cidade, tipo'),
        supabase.from('estoque').select('*'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (locaisRes.error) throw locaisRes.error;
      if (estoquesRes.error) throw estoquesRes.error;

      setItems(itemsRes.data || []);
      setLocais((locaisRes.data || []) as LocalEstoque[]);
      setEstoques(estoquesRes.data || []);
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

  // Compute the stock view with calculated fields
  const estoqueView = useMemo(() => {
    const views: EstoqueView[] = [];

    for (const item of items) {
      for (const local of locais) {
        const estoque = estoques.find(
          e => e.item_id === item.id && e.local_estoque_id === local.id
        );

        const minimo = estoque?.estoque_minimo ?? 0;
        const atual = estoque?.estoque_atual ?? 0;
        const reposicao = Math.max(0, minimo - atual);

        let status: EstoqueStatus = 'SEM_BASE';
        if (estoque) {
          status = atual < minimo ? 'CRITICO' : 'OK';
        }

        views.push({
          id: estoque?.id || `${item.id}-${local.id}`,
          codigo: item.codigo,
          modelo: item.modelo,
          cidade: local.cidade,
          tipo: local.tipo as EstoqueTipo,
          nome_local: local.nome_local,
          estoque_minimo: minimo,
          estoque_atual: atual,
          reposicao_sugerida: reposicao,
          status,
        });
      }
    }

    return views;
  }, [items, locais, estoques]);

  // Apply filters
  const filteredData = useMemo(() => {
    return estoqueView.filter(item => {
      // City filter
      if (filterCidade && item.cidade !== filterCidade) return false;

      // Type filter
      if (filterTipo && item.tipo !== filterTipo) return false;

      // Status filter
      if (filterStatus && item.status !== filterStatus) return false;

      // Search term (codigo or modelo)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesCodigo = item.codigo.toLowerCase().includes(search);
        const matchesModelo = item.modelo.toLowerCase().includes(search);
        if (!matchesCodigo && !matchesModelo) return false;
      }

      return true;
    });
  }, [estoqueView, filterCidade, filterTipo, filterStatus, searchTerm]);

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
    return filteredData.filter(item => item.status === 'CRITICO');
  }, [filteredData]);

  // Stats
  const stats = useMemo(() => {
    const total = estoqueView.length;
    const ok = estoqueView.filter(i => i.status === 'OK').length;
    const critico = estoqueView.filter(i => i.status === 'CRITICO').length;
    const semBase = estoqueView.filter(i => i.status === 'SEM_BASE').length;
    return { total, ok, critico, semBase };
  }, [estoqueView]);

  return {
    isLoading,
    filteredData,
    criticalItems,
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
  };
}
