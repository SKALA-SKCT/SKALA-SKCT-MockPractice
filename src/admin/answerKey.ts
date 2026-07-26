import type { AnswerKeyItem, Section } from '../types';
import { SECTIONS } from '../types';

export interface EditorRow {
  number: number;
  answer: number | null;
  correctRate: number | null;
}

export type RowsBySection = Partial<Record<Section, EditorRow[]>>;

export function makeRows(n: number): EditorRow[] {
  return Array.from({ length: n }, (_, i) => ({ number: i + 1, answer: null, correctRate: null }));
}

export function resizeRows(rows: EditorRow[], n: number): EditorRow[] {
  if (n <= rows.length) return rows.slice(0, Math.max(0, n));
  const extra = Array.from({ length: n - rows.length }, (_, i) => ({
    number: rows.length + i + 1,
    answer: null,
    correctRate: null,
  }));
  return [...rows, ...extra];
}

function clampRate(r: number): number {
  return Math.max(0, Math.min(100, r));
}

/**
 * "번호 정답 정답률" 3열, "정답 정답률" 2열(순차 번호), "정답" 1열(순차)을 모두 지원.
 * 구분자는 공백/탭/쉼표. 정답표를 책에서 빠르게 옮겨 적을 때 사용.
 */
export function parseBulk(text: string, base: EditorRow[], choices: number): EditorRow[] {
  const rows = base.map((r) => ({ ...r }));
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  let seq = 0;
  for (const line of lines) {
    const tok = line.split(/[\s,]+/).filter(Boolean);
    let num: number;
    let ans: number;
    let rate: number | null;
    if (tok.length >= 3) {
      num = parseInt(tok[0], 10);
      ans = parseInt(tok[1], 10);
      rate = parseFloat(tok[2]);
    } else if (tok.length === 2) {
      num = seq + 1;
      ans = parseInt(tok[0], 10);
      rate = parseFloat(tok[1]);
    } else if (tok.length === 1) {
      num = seq + 1;
      ans = parseInt(tok[0], 10);
      rate = null;
    } else {
      continue;
    }
    if (!Number.isFinite(num) || num < 1) continue;
    seq = num;
    const idx = num - 1;
    while (rows.length <= idx)
      rows.push({ number: rows.length + 1, answer: null, correctRate: null });
    const prev = rows[idx];
    rows[idx] = {
      number: num,
      answer: Number.isFinite(ans) && ans >= 1 && ans <= choices ? ans : prev.answer,
      correctRate: rate != null && Number.isFinite(rate) ? clampRate(rate) : prev.correctRate,
    };
  }
  return rows;
}

export function buildItems(rows: RowsBySection): AnswerKeyItem[] {
  const items: AnswerKeyItem[] = [];
  for (const sec of SECTIONS) {
    const rs = rows[sec];
    if (!rs) continue;
    for (const r of rs) {
      if (r.answer != null) {
        items.push({
          section: sec,
          number: r.number,
          answer: r.answer,
          correctRate: r.correctRate ?? 50,
        });
      }
    }
  }
  return items;
}

export function rowsFromItems(items: AnswerKeyItem[]): RowsBySection {
  const out: RowsBySection = {};
  for (const it of items) {
    const list = (out[it.section] ||= []);
    const idx = it.number - 1;
    while (list.length <= idx)
      list.push({ number: list.length + 1, answer: null, correctRate: null });
    list[idx] = { number: it.number, answer: it.answer, correctRate: it.correctRate };
  }
  return out;
}

export function includedSections(rows: RowsBySection): Section[] {
  return SECTIONS.filter((s) => rows[s]?.length);
}

export function countFilled(rows: RowsBySection): number {
  return buildItems(rows).length;
}
