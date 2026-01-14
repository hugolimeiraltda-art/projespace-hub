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

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const method = req.method;

    // =============================================
    // DOCUMENT OPERATIONS (PUT, DELETE on /documents)
    // =============================================
    
    if (url.pathname.endsWith('/documents') || url.pathname.includes('/documents/')) {
      
      // CREATE DOCUMENT - PUT /documents
      if (method === 'PUT') {
        const body = await req.json();
        const { customer_id, nome_arquivo, arquivo_url, tipo_arquivo, tamanho } = body;

        if (!customer_id || !nome_arquivo || !arquivo_url) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: customer_id, nome_arquivo, arquivo_url' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('customer_documents')
          .insert({
            customer_id,
            nome_arquivo,
            arquivo_url,
            tipo_arquivo: tipo_arquivo || null,
            tamanho: tamanho || null
          })
          .select()
          .single();

        if (error) {
          console.error('Insert document error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create document', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Document created:', data.id);
        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE DOCUMENT - DELETE /documents
      if (method === 'DELETE') {
        const body = await req.json();
        const { document_id } = body;

        if (!document_id) {
          return new Response(
            JSON.stringify({ error: 'Missing required field: document_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // First get the document to retrieve file path
        const { data: doc, error: fetchError } = await supabase
          .from('customer_documents')
          .select('arquivo_url')
          .eq('id', document_id)
          .single();

        if (fetchError) {
          console.error('Fetch document error:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Document not found', details: fetchError.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete from storage if file exists
        if (doc?.arquivo_url) {
          const { error: storageError } = await supabase.storage
            .from('customer-documents')
            .remove([doc.arquivo_url.replace('customer-documents/', '')]);

          if (storageError) {
            console.error('Storage delete error:', storageError);
            // Continue with database deletion even if storage fails
          }
        }

        // Delete from database
        const { error } = await supabase
          .from('customer_documents')
          .delete()
          .eq('id', document_id);

        if (error) {
          console.error('Delete document error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete document', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Document deleted:', document_id);
        return new Response(
          JSON.stringify({ success: true, message: 'Document deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // =============================================
    // CUSTOMER OPERATIONS (POST for update, DELETE)
    // =============================================

    // UPDATE CUSTOMER - PATCH
    if (method === 'PATCH') {
      const body = await req.json();
      const { customer_id, ...updateData } = body;

      if (!customer_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: customer_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.created_at;

      const { data, error } = await supabase
        .from('customer_portfolio')
        .update(updateData)
        .eq('id', customer_id)
        .select()
        .single();

      if (error) {
        console.error('Update customer error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update customer', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Customer updated:', customer_id);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE CUSTOMER - PUT
    if (method === 'PUT') {
      const body = await req.json();
      const { razao_social, contrato, filial, cnpj } = body;

      if (!razao_social || !contrato || !filial) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: razao_social, contrato, filial' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove id if present to let database generate it
      delete body.id;

      const { data, error } = await supabase
        .from('customer_portfolio')
        .insert(body)
        .select()
        .single();

      if (error) {
        console.error('Insert customer error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Customer created:', data.id);
      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE CUSTOMER - DELETE
    if (method === 'DELETE') {
      const body = await req.json();
      const { customer_id } = body;

      if (!customer_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: customer_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First delete all documents for this customer
      const { data: docs } = await supabase
        .from('customer_documents')
        .select('arquivo_url')
        .eq('customer_id', customer_id);

      // Delete files from storage
      if (docs && docs.length > 0) {
        const filePaths = docs
          .filter(d => d.arquivo_url)
          .map(d => d.arquivo_url.replace('customer-documents/', ''));
        
        if (filePaths.length > 0) {
          await supabase.storage.from('customer-documents').remove(filePaths);
        }

        // Delete document records
        await supabase
          .from('customer_documents')
          .delete()
          .eq('customer_id', customer_id);
      }

      // Delete customer
      const { error } = await supabase
        .from('customer_portfolio')
        .delete()
        .eq('id', customer_id);

      if (error) {
        console.error('Delete customer error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete customer', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Customer deleted:', customer_id);
      return new Response(
        JSON.stringify({ success: true, message: 'Customer and documents deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // READ OPERATIONS (GET, POST for query)
    // =============================================

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
    let include_documents = false;
    let customer_id = '';
    let limit = 100;
    let offset = 0;

    if (method === 'POST') {
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
      include_documents = body.include_documents === true;
      customer_id = body.customer_id || '';
      limit = parseInt(body.limit) || 100;
      offset = parseInt(body.offset) || 0;
    } else {
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
      include_documents = url.searchParams.get('include_documents') === 'true';
      customer_id = url.searchParams.get('customer_id') || '';
      limit = parseInt(url.searchParams.get('limit') || '100');
      offset = parseInt(url.searchParams.get('offset') || '0');
    }

    console.log('Query params:', { search, filial, contrato, sistema, app, tipo, noc, transbordo, gateway, include_documents, customer_id, limit, offset });

    // If customer_id is provided, return single customer with documents
    if (customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customer_portfolio')
        .select('*')
        .eq('id', customer_id)
        .single();

      if (customerError) {
        console.error('Customer fetch error:', customerError);
        return new Response(
          JSON.stringify({ error: 'Customer not found', details: customerError.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Always fetch documents for single customer
      const { data: documents, error: docsError } = await supabase
        .from('customer_documents')
        .select('id, nome_arquivo, arquivo_url, tipo_arquivo, tamanho, created_at')
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('Documents fetch error:', docsError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...customer,
            documents: documents || []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // If include_documents is true, fetch documents for each customer
    let customersWithDocs = data;
    if (include_documents && data && data.length > 0) {
      const customerIds = data.map((c: { id: string }) => c.id);
      
      const { data: allDocs, error: docsError } = await supabase
        .from('customer_documents')
        .select('id, customer_id, nome_arquivo, arquivo_url, tipo_arquivo, tamanho, created_at')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('Documents fetch error:', docsError);
      } else if (allDocs) {
        // Group documents by customer_id
        const docsByCustomer: Record<string, typeof allDocs> = {};
        for (const doc of allDocs) {
          if (!docsByCustomer[doc.customer_id]) {
            docsByCustomer[doc.customer_id] = [];
          }
          docsByCustomer[doc.customer_id].push(doc);
        }

        // Attach documents to each customer
        customersWithDocs = data.map((customer: { id: string }) => ({
          ...customer,
          documents: docsByCustomer[customer.id] || []
        }));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: customersWithDocs,
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
