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

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const filial = url.searchParams.get('filial') || '';
    const contrato = url.searchParams.get('contrato') || '';
    const cnpj = url.searchParams.get('cnpj') || '';
    const cidade = url.searchParams.get('cidade') || '';
    const uf = url.searchParams.get('uf') || '';
    const segmento = url.searchParams.get('segmento') || '';
    const consultor = url.searchParams.get('consultor') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('Query params:', { search, filial, contrato, cnpj, cidade, uf, segmento, consultor, limit, offset });

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
