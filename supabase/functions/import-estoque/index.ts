import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de códigos de local de estoque para cidade e tipo
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
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

    // Check user role
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

    // Parse request body
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
      console.error('Error fetching locations:', locError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar locais de estoque' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of cidade+tipo to location id
    const locationMap = new Map<string, string>();
    for (const loc of locations) {
      locationMap.set(`${loc.cidade}_${loc.tipo}`, loc.id);
    }

    // Group stock by item code
    const itemMap = new Map<string, { 
      modelo: string; 
      estoques: Map<string, number>; // localId -> quantidade
    }>();

    for (const row of stockRows) {
      const codigo = String(row.codigo).trim();
      if (!codigo || codigo === 'undefined' || codigo === 'null') {
        continue;
      }

      // Get location info from code
      const locationInfo = LOCATION_CODE_MAP[row.localCode];
      if (!locationInfo) {
        console.log(`Código de local não mapeado: ${row.localCode}`);
        continue;
      }

      const localId = locationMap.get(`${locationInfo.cidade}_${locationInfo.tipo}`);
      if (!localId) {
        console.log(`Local não encontrado para: ${locationInfo.cidade}_${locationInfo.tipo}`);
        continue;
      }

      if (!itemMap.has(codigo)) {
        itemMap.set(codigo, { 
          modelo: row.modelo || 'Sem modelo',
          estoques: new Map()
        });
      }

      const item = itemMap.get(codigo)!;
      // Accumulate stock if same item appears multiple times for same location
      const currentStock = item.estoques.get(localId) || 0;
      item.estoques.set(localId, currentStock + row.estoque);
    }

    let itemsProcessed = 0;
    let stockRecordsCreated = 0;

    for (const [codigo, data] of itemMap) {
      // Upsert item
      const { data: existingItem, error: itemError } = await supabaseAdmin
        .from('estoque_itens')
        .upsert(
          { codigo, modelo: data.modelo },
          { onConflict: 'codigo', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (itemError) {
        console.error(`Error upserting item ${codigo}:`, itemError);
        continue;
      }

      itemsProcessed++;

      // Process stock data for each location
      for (const [localId, estoqueAtual] of data.estoques) {
        // Upsert stock record - only update estoque_atual, keep minimo as is or default to 0
        const { data: existingStock } = await supabaseAdmin
          .from('estoque')
          .select('estoque_minimo')
          .eq('item_id', existingItem.id)
          .eq('local_estoque_id', localId)
          .maybeSingle();

        const { error: stockError } = await supabaseAdmin
          .from('estoque')
          .upsert(
            {
              item_id: existingItem.id,
              local_estoque_id: localId,
              estoque_minimo: existingStock?.estoque_minimo ?? 0,
              estoque_atual: Math.floor(estoqueAtual),
            },
            { onConflict: 'item_id,local_estoque_id', ignoreDuplicates: false }
          );

        if (stockError) {
          console.error(`Error upserting stock for ${codigo} at ${localId}:`, stockError);
        } else {
          stockRecordsCreated++;
        }
      }
    }

    // Record the import
    await supabaseAdmin
      .from('estoque_importacoes')
      .insert({
        arquivo_nome: fileName,
        itens_importados: itemsProcessed,
        importado_por: user.id,
      });

    console.log(`Import completed: ${itemsProcessed} items, ${stockRecordsCreated} stock records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação concluída: ${itemsProcessed} produtos processados, ${stockRecordsCreated} registros de estoque criados/atualizados.`,
        itemsProcessed,
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
