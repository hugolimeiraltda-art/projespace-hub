import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOCATION_CODE_MAP: Record<string, { cidade: string; tipo: string }> = {
  '135000': { cidade: 'BH', tipo: 'INSTALACAO' },
  '139000': { cidade: 'BH', tipo: 'MANUTENCAO' },
  '225104': { cidade: 'VIX', tipo: 'MANUTENCAO' },
  '2205900': { cidade: 'RIO', tipo: 'MANUTENCAO' },
  '2250800': { cidade: 'CD_SR', tipo: 'INSTALACAO' },
};

interface StockRow {
  codigo: string;
  modelo: string;
  localCode: string;
  estoque: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'administrativo')) {
      return new Response(
        JSON.stringify({ error: 'Acesso não autorizado. Apenas admin ou administrativo.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { stockRows, fileName } = await req.json() as { stockRows: StockRow[]; fileName: string };

    if (!stockRows || !Array.isArray(stockRows) || stockRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Dados de estoque inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importando ${stockRows.length} linhas do arquivo ${fileName}`);

    // Get all stock locations
    const { data: locations, error: locError } = await supabaseAdmin
      .from('locais_estoque')
      .select('*');

    if (locError || !locations) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar locais de estoque' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationMap = new Map<string, string>();
    for (const loc of locations) {
      locationMap.set(`${loc.cidade}_${loc.tipo}`, loc.id);
    }

    // Group stock by item code
    const itemMap = new Map<string, { 
      modelo: string; 
      estoques: Map<string, number>;
    }>();

    for (const row of stockRows) {
      const codigo = String(row.codigo).trim();
      if (!codigo || codigo === 'undefined' || codigo === 'null') continue;

      const locationInfo = LOCATION_CODE_MAP[row.localCode];
      if (!locationInfo) continue;

      const localId = locationMap.get(`${locationInfo.cidade}_${locationInfo.tipo}`);
      if (!localId) continue;

      if (!itemMap.has(codigo)) {
        itemMap.set(codigo, { modelo: row.modelo || 'Sem modelo', estoques: new Map() });
      }

      const item = itemMap.get(codigo)!;
      const currentStock = item.estoques.get(localId) || 0;
      item.estoques.set(localId, currentStock + row.estoque);
    }

    // BULK upsert all items at once
    const itemsToUpsert = Array.from(itemMap.entries()).map(([codigo, data]) => ({
      codigo,
      modelo: data.modelo,
    }));

    // Upsert in chunks of 500 to avoid payload limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < itemsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = itemsToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: bulkItemError } = await supabaseAdmin
        .from('estoque_itens')
        .upsert(chunk, { onConflict: 'codigo', ignoreDuplicates: false });

      if (bulkItemError) {
        console.error('Error bulk upserting items:', bulkItemError);
      }
    }

    // Fetch all items by their codes to get IDs
    const allCodigos = Array.from(itemMap.keys());
    const codigoToId = new Map<string, string>();
    
    for (let i = 0; i < allCodigos.length; i += 500) {
      const chunk = allCodigos.slice(i, i + 500);
      const { data: fetchedItems, error: fetchError } = await supabaseAdmin
        .from('estoque_itens')
        .select('id, codigo')
        .in('codigo', chunk);

      if (!fetchError && fetchedItems) {
        for (const item of fetchedItems) {
          codigoToId.set(item.codigo, item.id);
        }
      }
    }

    // Fetch ALL existing stock records to preserve estoque_minimo
    const allItemIds = Array.from(codigoToId.values());
    const existingStockMap = new Map<string, number>(); // "itemId_localId" -> estoque_minimo

    for (let i = 0; i < allItemIds.length; i += 500) {
      const chunk = allItemIds.slice(i, i + 500);
      const { data: existingStocks } = await supabaseAdmin
        .from('estoque')
        .select('item_id, local_estoque_id, estoque_minimo')
        .in('item_id', chunk);

      if (existingStocks) {
        for (const s of existingStocks) {
          existingStockMap.set(`${s.item_id}_${s.local_estoque_id}`, s.estoque_minimo);
        }
      }
    }

    // Build bulk stock upsert
    const stockToUpsert: { item_id: string; local_estoque_id: string; estoque_atual: number; estoque_minimo: number }[] = [];

    for (const [codigo, data] of itemMap) {
      const itemId = codigoToId.get(codigo);
      if (!itemId) continue;

      for (const [localId, estoqueAtual] of data.estoques) {
        const key = `${itemId}_${localId}`;
        const existingMinimo = existingStockMap.get(key) ?? 0;
        stockToUpsert.push({
          item_id: itemId,
          local_estoque_id: localId,
          estoque_atual: Math.floor(estoqueAtual),
          estoque_minimo: existingMinimo,
        });
      }
    }

    let stockRecordsCreated = 0;
    for (let i = 0; i < stockToUpsert.length; i += CHUNK_SIZE) {
      const chunk = stockToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: stockError } = await supabaseAdmin
        .from('estoque')
        .upsert(chunk, { onConflict: 'item_id,local_estoque_id', ignoreDuplicates: false });

      if (stockError) {
        console.error('Error bulk upserting stock:', stockError);
      } else {
        stockRecordsCreated += chunk.length;
      }
    }

    // Record the import
    await supabaseAdmin
      .from('estoque_importacoes')
      .insert({
        arquivo_nome: fileName,
        itens_importados: itemMap.size,
        importado_por: user.id,
      });

    console.log(`Import completed: ${itemMap.size} items, ${stockRecordsCreated} stock records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação concluída: ${itemMap.size} produtos processados, ${stockRecordsCreated} registros de estoque criados/atualizados.`,
        itemsProcessed: itemMap.size,
        stockRecordsCreated,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar importação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
