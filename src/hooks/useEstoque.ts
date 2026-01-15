import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EstoqueStatus, EstoqueTipo, LocalEstoque, EstoqueItem, Estoque } from '@/types/estoque';

export interface EstoqueItemAgrupado {
  id: string;
  codigo: string;
  modelo: string;
  estoques: Record<string, { minimo: number; atual: number; status: EstoqueStatus }>;
  statusGeral: EstoqueStatus;
}

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
      const estoquesPorLocal: Record<string, { minimo: number; atual: number; status: EstoqueStatus }> = {};
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
  };
}
