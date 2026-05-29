import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist of tables that admin can backup/prune, with their timestamp column
const TABLE_REGISTRY: Record<string, { module: string; dateCol: string; label: string }> = {
  orcamento_mensagens: { module: "Orçamentos IA", dateCol: "created_at", label: "Mensagens do chat IA" },
  orcamento_sessoes: { module: "Orçamentos IA", dateCol: "created_at", label: "Sessões de orçamento" },
  orcamento_midias: { module: "Orçamentos IA", dateCol: "created_at", label: "Mídias (metadados)" },
  orcamento_encaminhamentos_engenharia: { module: "Orçamentos IA", dateCol: "created_at", label: "Encaminhamentos engenharia" },
  project_notifications: { module: "Projetos", dateCol: "created_at", label: "Notificações de projeto" },
  project_comments: { module: "Projetos", dateCol: "created_at", label: "Comentários de projeto" },
  project_status_history: { module: "Projetos", dateCol: "created_at", label: "Histórico de status" },
  project_attachments: { module: "Projetos", dateCol: "created_at", label: "Anexos de projeto (metadados)" },
  project_ai_summaries: { module: "Projetos", dateCol: "created_at", label: "Resumos IA de projeto" },
  estoque_alertas: { module: "Estoque", dateCol: "created_at", label: "Alertas de estoque" },
  noc_alertas_reincidencia: { module: "Manutenção/NOC", dateCol: "created_at", label: "Alertas NOC reincidência" },
  manutencao_notificacoes: { module: "Manutenção", dateCol: "created_at", label: "Notificações de manutenção" },
  manutencao_pendencias_comentarios: { module: "Manutenção", dateCol: "created_at", label: "Comentários de pendências" },
  implantacao_noc_chamados: { module: "Implantação", dateCol: "created_at", label: "Chamados NOC" },
  sale_form_attachments: { module: "Implantação", dateCol: "created_at", label: "Anexos do formulário (metadados)" },
};

const BUCKETS = ["project-attachments", "orcamento-midias", "customer-documents", "prestador-documentos", "manutencao-laudos"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Acesso restrito a administradores" }, 403);

    const { action, params } = await req.json();

    switch (action) {
      case "stats": return json(await getStats(admin));
      case "backup_table": return await backupTable(admin, params);
      case "delete_table_period": return json(await deleteTablePeriod(admin, params));
      case "list_bucket": return json(await listBucket(admin, params));
      case "delete_bucket_period": return json(await deleteBucketPeriod(admin, params));
      case "backup_bucket_list": return await backupBucketList(admin, params);
      default: return json({ error: "Ação inválida" }, 400);
    }
  } catch (e: any) {
    console.error("data-admin error:", e);
    return json({ error: e.message || "Erro interno" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getStats(admin: any) {
  const tables: any[] = [];
  for (const [name, meta] of Object.entries(TABLE_REGISTRY)) {
    const { count } = await admin.from(name).select("*", { count: "exact", head: true });
    tables.push({ name, ...meta, rows: count ?? 0 });
  }

  const buckets: any[] = [];
  for (const b of BUCKETS) {
    let totalSize = 0;
    let totalFiles = 0;
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(b).list("", {
        limit: 1000,
        offset,
        sortBy: { column: "created_at", order: "asc" },
      });
      if (error || !data || data.length === 0) break;
      // recursive walk into folders one level (storage list returns folders)
      for (const item of data) {
        if (item.id === null) {
          // folder
          const { data: sub } = await admin.storage.from(b).list(item.name, { limit: 1000 });
          for (const f of sub || []) {
            if (f.metadata?.size) { totalSize += f.metadata.size; totalFiles += 1; }
          }
        } else if (item.metadata?.size) {
          totalSize += item.metadata.size; totalFiles += 1;
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    buckets.push({ name: b, files: totalFiles, sizeBytes: totalSize });
  }

  return { tables, buckets };
}

async function backupTable(admin: any, params: any) {
  const { table } = params || {};
  if (!TABLE_REGISTRY[table]) return json({ error: "Tabela não permitida" }, 400);
  const { data, error } = await admin.from(table).select("*");
  if (error) return json({ error: error.message }, 500);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${table}-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}

async function deleteTablePeriod(admin: any, params: any) {
  const { table, before } = params || {};
  if (!TABLE_REGISTRY[table]) throw new Error("Tabela não permitida");
  if (!before) throw new Error("Data de corte obrigatória");
  const dateCol = TABLE_REGISTRY[table].dateCol;
  const { count: total } = await admin.from(table).select("*", { count: "exact", head: true }).lt(dateCol, before);
  const { error } = await admin.from(table).delete().lt(dateCol, before);
  if (error) throw new Error(error.message);
  return { deleted: total ?? 0, table, before };
}

async function listBucket(admin: any, params: any) {
  const { bucket, prefix = "" } = params || {};
  if (!BUCKETS.includes(bucket)) throw new Error("Bucket não permitido");
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000, sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(error.message);
  return { items: data };
}

async function walkBucket(admin: any, bucket: string, prefix = ""): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error || !data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        const sub = await walkBucket(admin, bucket, full);
        all.push(...sub);
      } else {
        all.push({ ...item, path: full });
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function deleteBucketPeriod(admin: any, params: any) {
  const { bucket, before } = params || {};
  if (!BUCKETS.includes(bucket)) throw new Error("Bucket não permitido");
  if (!before) throw new Error("Data de corte obrigatória");
  const cutoff = new Date(before).getTime();
  const all = await walkBucket(admin, bucket);
  const toDelete = all
    .filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff)
    .map((f) => f.path);
  let freed = 0;
  for (const f of all) {
    if (f.created_at && new Date(f.created_at).getTime() < cutoff && f.metadata?.size) freed += f.metadata.size;
  }
  // delete in batches of 100
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw new Error(error.message);
  }
  return { deleted: toDelete.length, freedBytes: freed, bucket, before };
}

async function backupBucketList(admin: any, params: any) {
  const { bucket } = params || {};
  if (!BUCKETS.includes(bucket)) return json({ error: "Bucket não permitido" }, 400);
  const all = await walkBucket(admin, bucket);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const rows = [["path", "size_bytes", "created_at", "public_url"].join(",")];
  for (const f of all) {
    const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${f.path}`;
    rows.push([
      `"${f.path}"`,
      f.metadata?.size ?? 0,
      f.created_at ?? "",
      `"${url}"`,
    ].join(","));
  }
  return new Response(rows.join("\n"), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="backup-${bucket}-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
