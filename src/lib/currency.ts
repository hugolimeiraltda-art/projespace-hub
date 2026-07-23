/**
 * BRL currency helpers for input fields.
 * Standard: pt-BR — thousands "." and decimals "," with 2 fraction digits.
 * Use `formatBRLInput` on input `onBlur` to normalize whatever the user typed
 * (e.g. "3499", "3499.20", "3.499,2", "R$ 3.499,20") to "3.499,20".
 */

export function parseBRLNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[R$\s]/g, '').trim();
  if (!cleaned) return 0;
  // If it contains a comma, treat comma as decimal separator and remove dots (thousands).
  // Otherwise, if it contains a dot, treat as decimal (US-style typing).
  let normalized: string;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned;
  }
  const n = Number(normalized);
  return isFinite(n) ? n : 0;
}

export function formatBRLInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = parseBRLNumber(value);
  if (!n && String(value).replace(/[R$\s.,0]/g, '') === '') {
    // preserve empty-ish
    if (String(value).trim() === '') return '';
  }
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBRL(value: number | string | null | undefined): string {
  const n = parseBRLNumber(value);
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
