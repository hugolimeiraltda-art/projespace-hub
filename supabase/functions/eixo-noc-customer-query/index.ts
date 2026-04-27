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

const readBoolean = (value: unknown): boolean | null => {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

const sanitizeLimit = (value: unknown) => {
  const parsed = Number.parseInt(String(value || '100'), 10)
  if (Number.isNaN(parsed)) return 100
  return Math.min(Math.max(parsed, 1), 500)
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
    const expectedApiKey = Deno.env.get('CUSTOMER_API_KEY')

    if (!expectedApiKey) {
      return jsonResponse({ success: false, error: 'CUSTOMER_API_KEY is not configured' }, 500)
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
    const tipoCarteira = getParam('tipo_carteira').toUpperCase()
    const contrato = getParam('contrato')
    const alarmeCodigo = getParam('alarme_codigo')
    const razaoSocial = getParam('razao_social')
    const filial = getParam('filial').toUpperCase()
    const praca = getParam('praca')
    const tipoProduto = getParam('tipo') || getParam('tipo_produto')
    const status = getParam('status') || getParam('sistema')
    const noc = getParam('noc')
    const includeTechnicalNotes = readBoolean(body.include_observacoes ?? url.searchParams.get('include_observacoes')) ?? true
    const limit = sanitizeLimit(body.limit ?? url.searchParams.get('limit'))
    const offset = Math.max(Number.parseInt(String(body.offset ?? url.searchParams.get('offset') ?? '0'), 10) || 0, 0)

    let query = supabase
      .from('customer_portfolio')
      .select('id, tipo_carteira, contrato, alarme_codigo, razao_social, endereco, filial, praca, tipo, sistema, noc, app, leitores, transbordo, gateway, portoes, portas, dvr_nvr, cameras, zonas_perimetro, cancelas, totem_simples, totem_duplo, catracas, faciais_hik, faciais_avicam, faciais_outros, status_implantacao, updated_at', { count: 'exact' })

    if (tipoCarteira === 'PCI' || tipoCarteira === 'PPE') query = query.eq('tipo_carteira', tipoCarteira)
    if (contrato) query = query.ilike('contrato', '%' + contrato + '%')
    if (alarmeCodigo) query = query.ilike('alarme_codigo', '%' + alarmeCodigo + '%')
    if (razaoSocial) query = query.ilike('razao_social', '%' + razaoSocial + '%')
    if (filial) query = query.eq('filial', filial)
    if (praca) query = query.ilike('praca', '%' + praca + '%')
    if (tipoProduto) query = query.ilike('tipo', '%' + tipoProduto + '%')
    if (status) query = query.ilike('sistema', '%' + status + '%')
    if (noc) query = query.ilike('noc', '%' + noc + '%')
    if (search) {
      query = query.or('contrato.ilike.%' + search + '%,alarme_codigo.ilike.%' + search + '%,razao_social.ilike.%' + search + '%,endereco.ilike.%' + search + '%,praca.ilike.%' + search + '%,tipo.ilike.%' + search + '%')
    }

    const { data, error, count } = await query
      .order('tipo_carteira', { ascending: true })
      .order('razao_social', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Eixo NOC customer query error:', error)
      return jsonResponse({ success: false, error: 'Database query failed', details: error.message }, 500)
    }

    const customers = (data || []).map((customer) => ({
      id: customer.id,
      tipo_carteira: customer.tipo_carteira,
      contrato: customer.contrato,
      codigo_alarme: customer.alarme_codigo,
      razao_social: customer.razao_social,
      endereco: customer.endereco,
      filial: customer.filial,
      praca: customer.praca,
      tipo_produto: customer.tipo,
      status: customer.sistema,
      status_implantacao: customer.status_implantacao,
      noc: customer.noc,
      app: customer.app,
      acesso: {
        transbordo: customer.transbordo,
        gateway: customer.gateway,
      },
      equipamentos_principais: {
        portoes: customer.portoes,
        portas: customer.portas,
        dvr_nvr: customer.dvr_nvr,
        cameras: customer.cameras,
        zonas_perimetro: customer.zonas_perimetro,
        cancelas: customer.cancelas,
        totem_simples: customer.totem_simples,
        totem_duplo: customer.totem_duplo,
        catracas: customer.catracas,
        faciais_hik: customer.faciais_hik,
        faciais_avicam: customer.faciais_avicam,
        faciais_outros: customer.faciais_outros,
      },
      observacoes_tecnicas: includeTechnicalNotes ? customer.leitores : undefined,
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
        search,
        tipo_carteira: tipoCarteira || null,
        contrato,
        alarme_codigo: alarmeCodigo,
        razao_social: razaoSocial,
        filial,
        praca,
        tipo_produto: tipoProduto,
        status,
        noc,
      },
    })
  } catch (error) {
    console.error('Unexpected Eixo NOC customer API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ success: false, error: 'Internal server error', details: message }, 500)
  }
})