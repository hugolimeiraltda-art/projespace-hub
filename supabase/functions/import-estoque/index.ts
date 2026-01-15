import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockData {
  codigo: string;
  modelo: string;
  estoques: {
    cidade: string;
    tipo: string;
    minimo: number;
    atual: number;
  }[];
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
    const { stockData, fileName } = await req.json() as { stockData: StockData[]; fileName: string };

    if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Dados de estoque inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importando ${stockData.length} itens do arquivo ${fileName}`);

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

    let itemsProcessed = 0;
    let stockRecordsCreated = 0;

    for (const item of stockData) {
      // Normalize codigo to string
      const codigo = String(item.codigo).trim();
      if (!codigo || codigo === 'undefined' || codigo === 'null') {
        console.log('Skipping item with invalid codigo:', item);
        continue;
      }

      // Upsert item
      const { data: existingItem, error: itemError } = await supabaseAdmin
        .from('estoque_itens')
        .upsert(
          { codigo, modelo: item.modelo || 'Sem modelo' },
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
      for (const estoque of item.estoques) {
        const locationKey = `${estoque.cidade}_${estoque.tipo}`;
        const localId = locationMap.get(locationKey);

        if (!localId) {
          console.log(`Location not found for ${locationKey}`);
          continue;
        }

        // Upsert stock record
        const { error: stockError } = await supabaseAdmin
          .from('estoque')
          .upsert(
            {
              item_id: existingItem.id,
              local_estoque_id: localId,
              estoque_minimo: estoque.minimo || 0,
              estoque_atual: estoque.atual || 0,
            },
            { onConflict: 'item_id,local_estoque_id', ignoreDuplicates: false }
          );

        if (stockError) {
          console.error(`Error upserting stock for ${codigo} at ${locationKey}:`, stockError);
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
        message: `Importação concluída: ${itemsProcessed} itens processados, ${stockRecordsCreated} registros de estoque criados/atualizados.`,
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
