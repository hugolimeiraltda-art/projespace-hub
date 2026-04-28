import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const sanitizeLimit = (value: unknown) => {
  const parsed = Number.parseInt(String(value || '100'), 10)
  if (Number.isNaN(parsed)) return 100
  return Math.min(Math.max(parsed, 1), 1000)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed. Use GET or POST.' }, 405)
  }

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
    const expectedApiKey = Deno.env.get('EIXO_NOC_PPE_API_KEY')

    if (!expectedApiKey) {
      return jsonResponse({ success: false, error: 'EIXO_NOC_PPE_API_KEY is not configured' }, 500)
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return jsonResponse({ success: false, error: 'Unauthorized - Invalid API key' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ success: false, error: 'Backend credentials are not configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const getParam = (key: string) => (body[key] ?? url.searchParams.get(key) ?? '').toString().trim()

    const search = getParam('search')
    const contrato = getParam('contrato')
    const alarmeCodigo = getParam('alarme_codigo') || getParam('codigo_alarme')
    const razaoSocial = getParam('razao_social')
    const filial = getParam('filial').toUpperCase()
    const tipoProduto = getParam('tipo') || getParam('tipo_produto')
    const status = getParam('status') || getParam('sistema')
    const noc = getParam('noc')
    const app = getParam('app')
    const limit = sanitizeLimit(body.limit ?? url.searchParams.get('limit'))
    const offset = Math.max(Number.parseInt(String(body.offset ?? url.searchParams.get('offset') ?? '0'), 10) || 0, 0)

    let query = supabase
      .from('ppe_customers')
      .select('*', { count: 'exact' })

    if (contrato) query = query.ilike('contrato', '%' + contrato + '%')
    if (alarmeCodigo) query = query.ilike('alarme_codigo', '%' + alarmeCodigo + '%')
    if (razaoSocial) query = query.ilike('razao_social', '%' + razaoSocial + '%')
    if (filial) query = query.eq('filial', filial)
    if (tipoProduto) query = query.ilike('tipo', '%' + tipoProduto + '%')
    if (status) query = query.ilike('sistema', '%' + status + '%')
    if (noc) query = query.ilike('noc', '%' + noc + '%')
    if (app) query = query.ilike('app', '%' + app + '%')
    if (search) {
      query = query.or('contrato.ilike.%' + search + '%,alarme_codigo.ilike.%' + search + '%,razao_social.ilike.%' + search + '%,endereco.ilike.%' + search + '%,contato_nome.ilike.%' + search + '%,contato_telefone.ilike.%' + search + '%,filial.ilike.%' + search + '%,tipo.ilike.%' + search + '%,sistema.ilike.%' + search + '%,app.ilike.%' + search + '%')
    }

    const { data, error, count } = await query
      .order('razao_social', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Eixo NOC PPE full customer query error:', error)
      return jsonResponse({ success: false, error: 'Database query failed', details: error.message }, 500)
    }

    const customers = (data || []).map((customer) => ({
      ...customer,
      tipo_carteira: 'PPE',
      codigo_alarme: customer.alarme_codigo,
      tipo_produto: customer.tipo,
      status: customer.sistema,
      praca: customer.filial,
      equipamentos_principais: {
        cameras: customer.cameras,
      },
      observacoes_tecnicas: customer.observacoes,
      atualizado_em: customer.updated_at,
    }))

    return jsonResponse({
      success: true,
      data: customers,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
      filters: {
        tipo_carteira: 'PPE',
        search,
        contrato,
        alarme_codigo: alarmeCodigo,
        razao_social: razaoSocial,
        filial,
        tipo_produto: tipoProduto,
        status,
        noc,
        app,
      },
    })
  } catch (error) {
    console.error('Unexpected Eixo NOC PPE full customer API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ success: false, error: 'Internal server error', details: message }, 500)
  }
})