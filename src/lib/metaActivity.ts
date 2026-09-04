import type { MetaAccountActivity } from '../services/facebook';
import type { ReportLog } from '../components/reports/reportLogs';

const labels: Record<string, string> = {
  create_ad: 'Se creó el anuncio', create_ad_set: 'Se creó el conjunto de anuncios',
  create_campaign_group: 'Se creó la campaña', create_campaign_legacy: 'Se creó la campaña',
  update_ad_set_budget: 'Se modificó el presupuesto del conjunto', update_campaign_budget: 'Se modificó el presupuesto de la campaña',
  update_ad_creative: 'Se actualizó el contenido del anuncio', edit_and_update_ad_creative: 'Se actualizó el contenido del anuncio',
  update_ad_friendly_name: 'Se cambió el nombre del anuncio', update_ad_set_name: 'Se cambió el nombre del conjunto', update_campaign_name: 'Se cambió el nombre de la campaña',
  update_ad_set_target_spec: 'Se configuró el público y las ubicaciones del conjunto', update_ad_targets_spec: 'Se configuró la segmentación del anuncio',
  update_ad_set_optimization_goal: 'Se configuró el objetivo de optimización del conjunto',
  update_ad_set_bid_strategy: 'Se configuró la estrategia de puja del conjunto',
  update_ad_set_bidding: 'Se ajustó la puja del conjunto',
  update_ad_set_duration: 'Se modificaron las fechas del conjunto', update_campaign_schedule: 'Se modificaron las fechas de la campaña',
};
const creationTypes = new Set(['create_ad', 'create_ad_set', 'create_campaign_group', 'create_campaign_legacy']);
const statusTypes = new Set(['update_ad_run_status', 'update_ad_set_run_status', 'update_campaign_run_status']);
const budgetTypes = new Set(['update_ad_set_budget', 'update_campaign_budget']);
const ignored = /^(ad_account_billing|funding_event|add_funding|remove_funding|add_images$|edit_images$|delete_images$)/;

export function activityDay(value: string, timeZone: string): string | undefined {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function extraData(value: unknown): any {
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; }
}
function canonical(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value) ?? '';
}
// Only convert currencies with a known Meta offset; never guess an amount.
const offsets: Record<string, number> = { ARS: 100, USD: 100, EUR: 100, BRL: 100, PEN: 100, MXN: 100, UYU: 100, GBP: 100, CAD: 100, AUD: 100, JPY: 1, KRW: 1 };
export function activityBudgetDetail(data: any, fallbackCurrency: string): string {
  const old = data.old_value, next = data.new_value;
  const oldCurrency = old?.currency || data.currency || fallbackCurrency;
  const currency = next?.currency || data.currency || fallbackCurrency;
  const a = old && typeof old === 'object' ? old.old_value : old;
  const b = next && typeof next === 'object' ? next.new_value : next;
  const valid = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0;
  if (!valid(a) || !valid(b) || !offsets[currency] || oldCurrency !== currency) return '';
  const money = (value: number) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value / offsets[currency]);
  const interval = String(next?.additional_value || data.additional_value || '');
  const suffix = /por día|diario|per day|daily/i.test(interval) ? ' por día' : /total|lifetime/i.test(interval) ? ' de presupuesto total' : '';
  return ` De ${currency} ${money(Number(a))} a ${currency} ${money(Number(b))}${suffix}.`;
}

/** Presentation-only grouping. Raw Meta records never become editable manual notes. */
export function collectMetaActivity(rows: MetaAccountActivity[], accountId: string, since: string, until: string, currency = 'ARS', timeZone = 'America/Argentina/Buenos_Aires') {
  const logs: ReportLog[] = [], automatic: ReportLog[] = [];
  const seen = new Set<string>();
  const batches = new Map<string, { row: MetaAccountActivity; day: string; objects: Map<string, string> }>();
  let omitted = 0, unresolved = 0;
  for (const row of rows) {
    const day = activityDay(row.event_time || '', timeZone);
    if (!day) { unresolved++; continue; }
    if (day < since || day > until) continue;
    const data = extraData(row.extra_data);
    const identity = canonical([accountId.replace(/^act_/, ''), row.event_time, row.event_type, row.object_id, row.object_name, row.actor_id, row.actor_name, data]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    const type = row.event_type || '';
    const name = row.object_name || 'Sin nombre informado';
    const system = /^(meta|facebook|system|sistema)$/i.test((row.actor_name || '').trim());
    if (ignored.test(type)) { omitted++; continue; }
    const base: ReportLog = { id: 'meta-' + identity, date: day.slice(8) + '/' + day.slice(5, 7), sortDate: day + 'T' + new Date(row.event_time!).toISOString(), description: '', source: system ? 'Meta · Automático' : 'Meta Ads', actor: row.actor_name, category: 'change' };
    if (type === 'first_delivery_event' || /^ad_review_/.test(type) || system && !labels[type] && !statusTypes.has(type) && !creationTypes.has(type)) {
      automatic.push({ ...base, source: 'Meta · Automático', description: `${row.translated_event_type || 'Actualización automática'}: «${name}».` });
      continue;
    }
    if (type === 'update_ad_run_status_to_be_set_after_review') { omitted++; continue; }
    if (creationTypes.has(type)) {
      const key = canonical([type, row.event_time, row.actor_id, row.actor_name]);
      const group = batches.get(key) || { row, day, objects: new Map<string, string>() };
      group.objects.set(row.object_id || identity, name); batches.set(key, group); continue;
    }
    if (statusTypes.has(type)) {
      const state = data.run_status?.new_value;
      const text = typeof data.new_value === 'string' ? data.new_value.toLowerCase() : '';
      const active = state === 1 || /^(activo|active)$/.test(text);
      const paused = state === 8 || /^(inactivo|inactive|paused|en pausa)$/.test(text);
      const archived = /^(archived|archivado|deleted|eliminado)$/.test(text);
      const oldState = data.run_status?.old_value;
      const oldText = typeof data.old_value === 'string' ? data.old_value.toLowerCase() : '';
      if (system && oldState !== 1 && oldState !== 8 && !/^(activo|active|inactivo|inactive|paused|en pausa)$/.test(oldText)) {
        automatic.push({ ...base, description: `${row.translated_event_type || 'Actualización automática'}: «${name}».` });
        continue;
      }
      if (!active && !paused && !archived) { omitted++; continue; }
      const object = type === 'update_ad_run_status' ? 'el anuncio' : type === 'update_ad_set_run_status' ? 'el conjunto' : 'la campaña';
      base.description = `${active ? 'Se activó' : paused ? 'Se pausó' : /archiv/.test(text) ? 'Se archivó' : 'Se eliminó'} ${object} «${name}».`;
    } else {
      if (!labels[type] && !/^(create_|update_|edit_)/.test(type)) { omitted++; continue; }
      base.description = `${labels[type] || row.translated_event_type || 'Cambio registrado en Meta'} «${name}».`;
      if (budgetTypes.has(type)) base.description += activityBudgetDetail(data, currency);
      base.category = budgetTypes.has(type) ? 'presupuesto' : /creative/.test(type) ? 'creativo' : 'config';
    }
    logs.push(base);
  }
  for (const [key, group] of batches) {
    const names = [...group.objects.values()];
    const nameCounts = new Map<string, number>();
    names.forEach(name => nameCounts.set(name, (nameCounts.get(name) || 0) + 1));
    const nameList = [...nameCounts].map(([name, count]) => `«${name}»${count > 1 ? ` (${count})` : ''}`).join(', ');
    const noun = group.row.event_type === 'create_ad' ? 'anuncios' : group.row.event_type === 'create_ad_set' ? 'conjuntos de anuncios' : 'campañas';
    logs.push({ id: 'meta-create-' + accountId + key, date: group.day.slice(8) + '/' + group.day.slice(5, 7), sortDate: group.day + 'T' + new Date(group.row.event_time!).toISOString(), source: /^(meta|facebook|system|sistema)$/i.test(group.row.actor_name || '') ? 'Meta · Automático' : 'Meta Ads', actor: group.row.actor_name, category: 'estructura', description: names.length === 1 ? `${labels[group.row.event_type!]} «${names[0]}».` : `Se crearon ${names.length} ${noun}: ${nameList}.` });
  }
  const sort = (a: ReportLog, b: ReportLog) => a.sortDate!.localeCompare(b.sortDate!) || a.id.localeCompare(b.id);
  return { logs: logs.sort(sort), automatic: automatic.sort(sort), omitted, unresolved };
}
