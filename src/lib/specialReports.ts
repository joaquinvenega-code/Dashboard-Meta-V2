import { eachDayOfInterval, format, isValid, parseISO } from 'date-fns';
import type { MonthlyReportDocumentProps } from '../components/reports/MonthlyReportDocument';
import { positiveNumber, type DailyReportPoint, type ReportMode } from '../components/reports/reportData';

export const SPECIAL_SECTIONS = { performance: 'Evolución y audiencias', assets: 'Creatividades', geography: 'Distribución geográfica', management: 'Bitácora y conclusiones' } as const;
export type SpecialSnapshot = Omit<MonthlyReportDocumentProps, 'onUpdate' | 'isEditing' | 'texts' | 'sections' | 'theme'>;
export interface SpecialReport {
  version: 1; id: string; status: 'draft' | 'final'; createdAt: string; updatedAt: string; finalizedAt?: string;
  accountId: string; clientName: string; title: string; objective: string; since: string; until: string;
  mode: ReportMode; theme: 'light' | 'dark'; scope: 'account' | 'campaigns';
  campaigns: { id: string; name: string }[];
  sections: NonNullable<MonthlyReportDocumentProps['sections']>;
  texts: MonthlyReportDocumentProps['texts']; snapshot?: SpecialSnapshot;
}
export function reportValidation(report: SpecialReport, today = format(new Date(), 'yyyy-MM-dd')): string {
  if (!report.accountId) return 'Elegí un cliente.';
  if (!report.title.trim()) return 'Escribí un nombre para el informe.';
  if (report.title.length > 120 || report.objective.length > 1200) return 'Revisá la extensión del título y del objetivo.';
  const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
  if (!validDay(report.since) || !validDay(report.until) || report.since > report.until) return 'Elegí un período válido: el inicio debe ser anterior o igual al fin.';
  if (report.until > today) return 'La fecha de fin no puede ser futura.';
  if (report.scope === 'campaigns' && (!report.campaigns.length || report.campaigns.some(c => !/^\d+$/.test(c.id)))) return 'Elegí al menos una campaña.';
  return '';
}
export function specialDailySeries(rows: any[], since: string, until: string): DailyReportPoint[] {
  if (!rows.length) return [];
  const byDate = new Map(rows.map(row => [row.date, row]));
  const acrossYears = since.slice(0, 4) !== until.slice(0, 4);
  return eachDayOfInterval({ start: parseISO(since), end: parseISO(until) }).map(day => {
    const row = byDate.get(format(day, 'yyyy-MM-dd'));
    const value = (key: string) => row ? positiveNumber(row[key]) : null;
    return { date: format(day, acrossYears ? 'dd/MM/yy' : 'dd/MM'), revenue: value('revenue'), purchases: value('purchases'), spend: value('spend'), messages: value('messages'), leads: value('leads') };
  });
}
export function finalizeSpecialReport(report: SpecialReport): SpecialReport {
  const error = reportValidation(report);
  if (error) throw new Error(error);
  if (!report.snapshot || report.snapshot.dataAvailable === false) throw new Error('Generá el informe con datos antes de finalizarlo.');
  const now = new Date().toISOString();
  return structuredClone({ ...report, status: 'final', finalizedAt: now, updatedAt: now });
}
export function duplicateSpecialReport(report: SpecialReport): SpecialReport {
  const now = new Date().toISOString();
  return structuredClone({ ...report, id: crypto.randomUUID(), status: 'draft', title: `${report.title.slice(0, 112)} (copia)`, createdAt: now, updatedAt: now, finalizedAt: undefined, snapshot: undefined });
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('orion-special-reports', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('reports', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo acceder a los informes guardados en este navegador.'));
    request.onblocked = () => reject(new Error('Cerrá otras pestañas de Orion y volvé a intentar.'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reports', mode);
    const request = action(tx.objectStore('reports'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('No se pudo guardar o leer el informe. Revisá el espacio y los permisos del navegador.')); };
  });
}
export async function listSpecialReports(): Promise<SpecialReport[]> {
  const records = await transaction('readonly', store => store.getAll());
  return records.filter((r: SpecialReport) => r.version === 1).sort((a: SpecialReport, b: SpecialReport) => b.updatedAt.localeCompare(a.updatedAt));
}
let pendingSave: Promise<void> = Promise.resolve();
export function saveSpecialReport(report: SpecialReport): Promise<void> {
  const copy = structuredClone(report);
  const save = pendingSave.catch(() => undefined).then(async () => {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const previous = store.get(copy.id);
      let locked = false;
      previous.onsuccess = () => {
        // A stale draft open in another tab must not overwrite a final delivery.
        if (previous.result?.status === 'final') { locked = true; tx.abort(); }
        else store.put(copy);
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(new Error(locked ? 'Este informe ya fue finalizado. Abrí su versión guardada o creá una copia.' : 'No se pudo guardar el informe. Revisá el espacio y los permisos del navegador.'));
      };
    });
  });
  pendingSave = save;
  return save;
}
