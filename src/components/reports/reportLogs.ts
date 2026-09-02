import { format, isValid, parseISO } from 'date-fns';
import type { AccountNote } from '../../types';

export interface ReportLog { id: string; date: string; description: string; category?: string; source?: string; sortDate?: string }
const accountKey = (value: unknown) => String(value || '').replace(/^act_/, '');
const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');
function fullDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = parseISO(value);
    if (isValid(date)) return format(date, 'yyyy-MM-dd');
  }
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return fullDate(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
}
/** Local notes are authoritative; deduplicate mirrored sources, not repeated actions. */
export function collectReportLogs(notes: AccountNote[], remote: any[], accountId: string, month: string) {
  const local = notes.filter(note => accountKey(note.accountId) === accountKey(accountId));
  const localIds = new Set(local.map(note => note.id));
  const logs: ReportLog[] = [];
  const mirrors = new Map<string, number>();
  let unresolved = 0;
  for (const note of local) {
    const day = fullDate(note.timestamp);
    if (!day) { unresolved++; continue; }
    if (!day.startsWith(month) || !note.text.trim()) continue;
    const key = day + '|' + cleanText(note.text);
    mirrors.set(key, (mirrors.get(key) || 0) + 1);
    logs.push({ id: 'local-' + note.id, date: day.slice(8) + '/' + day.slice(5, 7), sortDate: day, description: note.text, category: note.category, source: note.tags?.some(tag => tag.toLowerCase() === 'voz') ? 'Voz' : 'Manual' });
  }
  for (const [index, row] of remote.entries()) {
    if (row.clientId && accountKey(row.clientId) !== accountKey(accountId)) continue;
    if (localIds.has(row.noteId || row.id)) continue;
    const description = String(row.description || row.text || '');
    if (!description.trim()) continue;
    let day = fullDate(row.timestamp) || fullDate(row.date);
    // Legacy DD/MM records use their recorded creation year, never the selected year.
    if (!day && /^\d{1,2}\/\d{1,2}$/.test(row.date || '')) {
      const created = fullDate(row.createdAt) || (/^\d{13}$/.test(String(row.id)) ? fullDate(new Date(Number(row.id)).toISOString()) : undefined);
      if (created) { const [d, m] = row.date.split('/'); day = fullDate(`${created.slice(0, 4)}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`); }
    }
    if (!day) { unresolved++; continue; }
    if (!day.startsWith(month)) continue;
    const key = day + '|' + cleanText(description);
    if (mirrors.get(key)) { mirrors.set(key, mirrors.get(key)! - 1); continue; }
    logs.push({ id: 'api-' + (row.id || index), date: day.slice(8) + '/' + day.slice(5, 7), sortDate: day, description, category: row.category, source: row.source === 'voice' ? 'Voz' : 'Bitácora' });
  }
  return { logs: logs.sort((a, b) => a.sortDate!.localeCompare(b.sortDate!)), unresolved };
}
