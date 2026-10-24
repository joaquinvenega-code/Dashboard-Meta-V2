export const REPORT_CHUNK_BYTES = 600 * 1024;
export const REPORT_BATCH_BYTES = 60 * 1024 * 1024;
export const REPORT_RETENTION_DAYS = 28;
export const REPORT_PUBLISHER_UID = 'orion-weekly-publisher';

export interface DownloadReport {
  id: string;
  clientId: string;
  name: string;
  status: 'listo' | 'requiere_revision';
  file?: string;
  bytes?: number;
  chunks?: number;
  sha256?: string;
}
export interface DownloadBatch {
  id: string;
  since: string;
  until: string;
  generatedAt: string;
  expiresAt: string;
  status: 'uploading' | 'ready';
  reports: DownloadReport[];
}

export function validDownloadId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}
export function validateDownloadBatch(id: string, value: unknown): DownloadBatch {
  const b = value as DownloadBatch;
  if (!validDownloadId(id) || !b || !['ready', 'uploading'].includes(b.status)
    || !/^\d{4}-\d{2}-\d{2}$/.test(b.since) || !/^\d{4}-\d{2}-\d{2}$/.test(b.until)
    || !Number.isFinite(Date.parse(b.generatedAt)) || !Number.isFinite(Date.parse(b.expiresAt))
    || !Array.isArray(b.reports) || b.reports.length > 300) throw new Error('Listado de informes inválido.');
  const ids = new Set<string>();
  let bytes = 0;
  for (const r of b.reports) {
    if (!validDownloadId(r.id) || ids.has(r.id) || typeof r.name !== 'string' || r.name.length > 500
      || typeof r.clientId !== 'string' || !['listo', 'requiere_revision'].includes(r.status)) throw new Error('Informe inválido.');
    ids.add(r.id);
    if (r.status === 'listo') {
      if (typeof r.file !== 'string' || !/^[a-zA-Z0-9_-]+\.pdf$/.test(r.file) || r.file.length > 240
        || !Number.isInteger(r.bytes) || r.bytes! < 5 || r.bytes! > REPORT_BATCH_BYTES
        || r.chunks !== Math.ceil(r.bytes! / REPORT_CHUNK_BYTES)
        || !/^[a-f0-9]{64}$/.test(r.sha256 || '')) throw new Error('Archivo de informe inválido.');
      bytes += r.bytes!;
    }
  }
  if (bytes > REPORT_BATCH_BYTES) throw new Error('Lote demasiado grande.');
  return { ...b, id };
}

export async function assembleReport(report: DownloadReport, parts: Uint8Array[]): Promise<Uint8Array> {
  if (report.status !== 'listo' || parts.length !== report.chunks || parts.some((p, i) =>
    p.length !== (i === parts.length - 1 ? report.bytes! - i * REPORT_CHUNK_BYTES : REPORT_CHUNK_BYTES))) {
    throw new Error('La descarga está incompleta. Volvé a intentarlo.');
  }
  const result = new Uint8Array(report.bytes!);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  const digest = await crypto.subtle.digest('SHA-256', result);
  const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== report.sha256 || new TextDecoder().decode(result.slice(0, 5)) !== '%PDF-') {
    throw new Error('No se pudo verificar el PDF. Volvé a descargarlo.');
  }
  return result;
}
