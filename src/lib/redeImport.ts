import * as XLSX from 'xlsx';

export interface RedeParseResult {
  eqRows: Record<string, string | null>[];
  lkRows: Record<string, string | null>[];
}

const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const cell = (row: unknown[], idx: number | undefined) => {
  if (idx === undefined || idx < 0) return null;
  const s = String(row[idx] ?? '').trim();
  return s === '' || s === '-' ? null : s;
};

const findCol = (header: unknown[], ...keywords: string[]) => {
  for (let i = 0; i < header.length; i++) {
    const h = norm(header[i]);
    if (!h) continue;
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return undefined;
};

export function parseRedePlanilha(buffer: ArrayBuffer): RedeParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const eqRows: Record<string, string | null>[] = [];
  const lkRows: Record<string, string | null>[] = [];

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      blankrows: false,
      defval: '',
    });
    let mode: 'none' | 'eq' | 'lk' = 'none';
    let cols: Record<string, number | undefined> = {};

    for (const row of rows) {
      const joined = row.map(norm).join(' | ');
      if (!joined.replace(/\|/g, '').trim()) {
        mode = 'none';
        continue;
      }

      if (joined.includes('EQUIPAMENTO')) {
        mode = 'eq';
        cols = {
          equipamento: findCol(row, 'EQUIPAMENTO'),
          ip: findCol(row, 'IP'),
          ddns: findCol(row, 'DDNS'),
          usuario: findCol(row, 'USUARIO', 'LOGIN'),
          senha: findCol(row, 'SENHA'),
          porta_web: findCol(row, 'WEB'),
          porta_tcp: findCol(row, 'TCP'),
          porta_rtsp: findCol(row, 'RTSP'),
          ramal: findCol(row, 'RAMAL'),
          senha_ramal: undefined,
        };
        const senhaIdxs = row.map((c, i) => ({ i, h: norm(c) })).filter((x) => x.h.includes('SENHA'));
        if (senhaIdxs.length > 1) {
          cols.senha = senhaIdxs[0].i;
          cols.senha_ramal = senhaIdxs[senhaIdxs.length - 1].i;
        }
        continue;
      }

      if (joined.includes('PROVEDOR') || joined.includes('LINK DE INTERNET') || joined.includes('OPERADORA')) {
        mode = 'lk';
        cols = {
          provedor: findCol(row, 'PROVEDOR', 'OPERADORA', 'LINK'),
          contato: findCol(row, 'CONTATO', 'TELEFONE'),
          usuario: findCol(row, 'USUARIO', 'LOGIN'),
          senha: findCol(row, 'SENHA'),
          ip_global: findCol(row, 'IP GLOBAL', 'GLOBAL'),
          ip: findCol(row, 'IP INTERNO', 'IP LAN'),
          mask: findCol(row, 'MASK', 'MASCARA'),
          gateway: findCol(row, 'GATEWAY'),
          dns1: findCol(row, 'DNS 1', 'DNS1', 'DNS PRIMARIO'),
          dns2: findCol(row, 'DNS 2', 'DNS2', 'DNS SECUNDARIO'),
          observacoes: findCol(row, 'OBS'),
        };
        if (cols.ip === undefined) cols.ip = findCol(row, 'IP');
        continue;
      }

      if (mode === 'eq') {
        const equipamento = cell(row, cols.equipamento);
        if (!equipamento) continue;
        eqRows.push({
          equipamento,
          ip: cell(row, cols.ip),
          ddns: cell(row, cols.ddns),
          usuario: cell(row, cols.usuario),
          senha: cell(row, cols.senha),
          porta_web: cell(row, cols.porta_web),
          porta_tcp: cell(row, cols.porta_tcp),
          porta_rtsp: cell(row, cols.porta_rtsp),
          ramal: cell(row, cols.ramal),
          senha_ramal: cell(row, cols.senha_ramal),
        });
      } else if (mode === 'lk') {
        const provedor = cell(row, cols.provedor);
        if (!provedor) continue;
        lkRows.push({
          provedor,
          contato: cell(row, cols.contato),
          usuario: cell(row, cols.usuario),
          senha: cell(row, cols.senha),
          ip_global: cell(row, cols.ip_global),
          ip: cell(row, cols.ip),
          mask: cell(row, cols.mask),
          gateway: cell(row, cols.gateway),
          dns1: cell(row, cols.dns1),
          dns2: cell(row, cols.dns2),
          observacoes: cell(row, cols.observacoes),
        });
      }
    }
  }

  return { eqRows, lkRows };
}

export const isPlanilhaRede = (fileName: string) =>
  /\.(xlsx|xls|csv)$/i.test(fileName);
