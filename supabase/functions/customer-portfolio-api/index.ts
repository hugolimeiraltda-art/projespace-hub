import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('CUSTOMER_API_KEY');
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse parameters from query string (GET) or body (POST)
    let search = '';
    let filial = '';
    let contrato = '';
    let cnpj = '';
    let cidade = '';
    let uf = '';
    let segmento = '';
    let consultor = '';
    let sistema = '';
    let app = '';
    let tipo = '';
    let noc = '';
    let leitores = '';
    let transbordo: boolean | null = null;
    let gateway: boolean | null = null;
    let alarme_codigo = '';
    let data_ativacao_inicio = '';
    let data_ativacao_fim = '';
    let limit = 100;
    let offset = 0;

    if (req.method === 'POST') {
      const body = await req.json();
      search = body.search || '';
      filial = body.filial || '';
      contrato = body.contrato || '';
      cnpj = body.cnpj || '';
      cidade = body.cidade || '';
      uf = body.uf || '';
      segmento = body.segmento || '';
      consultor = body.consultor || '';
      sistema = body.sistema || '';
      app = body.app || '';
      tipo = body.tipo || '';
      noc = body.noc || '';
      leitores = body.leitores || '';
      transbordo = body.transbordo !== undefined ? body.transbordo : null;
      gateway = body.gateway !== undefined ? body.gateway : null;
      alarme_codigo = body.alarme_codigo || '';
      data_ativacao_inicio = body.data_ativacao_inicio || '';
      data_ativacao_fim = body.data_ativacao_fim || '';
      limit = parseInt(body.limit) || 100;
      offset = parseInt(body.offset) || 0;
    } else {
      const url = new URL(req.url);
      search = url.searchParams.get('search') || '';
      filial = url.searchParams.get('filial') || '';
      contrato = url.searchParams.get('contrato') || '';
      cnpj = url.searchParams.get('cnpj') || '';
      cidade = url.searchParams.get('cidade') || '';
      uf = url.searchParams.get('uf') || '';
      segmento = url.searchParams.get('segmento') || '';
      consultor = url.searchParams.get('consultor') || '';
      sistema = url.searchParams.get('sistema') || '';
      app = url.searchParams.get('app') || '';
      tipo = url.searchParams.get('tipo') || '';
      noc = url.searchParams.get('noc') || '';
      leitores = url.searchParams.get('leitores') || '';
      transbordo = url.searchParams.get('transbordo') !== null ? url.searchParams.get('transbordo') === 'true' : null;
      gateway = url.searchParams.get('gateway') !== null ? url.searchParams.get('gateway') === 'true' : null;
      alarme_codigo = url.searchParams.get('alarme_codigo') || '';
      data_ativacao_inicio = url.searchParams.get('data_ativacao_inicio') || '';
      data_ativacao_fim = url.searchParams.get('data_ativacao_fim') || '';
      limit = parseInt(url.searchParams.get('limit') || '100');
      offset = parseInt(url.searchParams.get('offset') || '0');
    }

    console.log('Query params:', { search, filial, contrato, sistema, app, tipo, noc, transbordo, gateway, limit, offset });

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('customer_portfolio')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`razao_social.ilike.%${search}%,contrato.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }
    
    if (filial) {
      query = query.eq('filial', filial);
    }

    if (contrato) {
      query = query.ilike('contrato', `%${contrato}%`);
    }

    if (cnpj) {
      query = query.ilike('cnpj', `%${cnpj}%`);
    }

    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    if (uf) {
      query = query.eq('uf', uf);
    }

    if (segmento) {
      query = query.ilike('segmento', `%${segmento}%`);
    }

    if (consultor) {
      query = query.ilike('consultor', `%${consultor}%`);
    }

    if (sistema) {
      query = query.eq('sistema', sistema);
    }

    if (app) {
      query = query.eq('app', app);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (noc) {
      query = query.eq('noc', noc);
    }

    if (leitores) {
      query = query.ilike('leitores', `%${leitores}%`);
    }

    if (transbordo !== null) {
      query = query.eq('transbordo', transbordo);
    }

    if (gateway !== null) {
      query = query.eq('gateway', gateway);
    }

    if (alarme_codigo) {
      query = query.ilike('alarme_codigo', `%${alarme_codigo}%`);
    }

    if (data_ativacao_inicio) {
      query = query.gte('data_ativacao', data_ativacao_inicio);
    }

    if (data_ativacao_fim) {
      query = query.lte('data_ativacao', data_ativacao_fim);
    }

    // Apply pagination and ordering
    query = query
      .order('razao_social', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Returned ${data?.length || 0} customers out of ${count} total`);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
