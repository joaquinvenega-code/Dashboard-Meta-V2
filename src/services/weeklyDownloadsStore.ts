import { collection, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, Bytes } from 'firebase/firestore';
import { db, portfolioAuth } from './firebaseService';
import { assembleReport, validDownloadId, validateDownloadBatch, type DownloadBatch } from '../lib/weeklyDownloads';

function requireOwner(uid: string) {
  if (!db || !validDownloadId(uid) || portfolioAuth?.currentUser?.uid !== uid) throw new Error('Conectá tu cartera con Google para descargar los informes.');
}
export async function listWeeklyDownloads(uid: string): Promise<DownloadBatch[]> {
  requireOwner(uid);
  const snapshot = await getDocsFromServer(query(collection(db, 'orionUsers', uid, 'weeklyReports'), orderBy('since', 'desc'), limit(8)));
  requireOwner(uid);
  return snapshot.docs.map(d => validateDownloadBatch(d.id, d.data()))
    .filter(b => b.status === 'ready' && Date.parse(b.expiresAt) > Date.now());
}
export async function downloadWeeklyReport(uid: string, batchId: string, reportId: string) {
  requireOwner(uid);
  if (!validDownloadId(batchId) || !validDownloadId(reportId)) throw new Error('Informe inválido.');
  const ref = doc(db, 'orionUsers', uid, 'weeklyReports', batchId);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new Error('Este informe ya no está disponible. Actualizá el listado.');
  const batch = validateDownloadBatch(snapshot.id, snapshot.data());
  if (batch.status !== 'ready' || Date.parse(batch.expiresAt) <= Date.now()) throw new Error('Este informe ya no está disponible.');
  const report = batch.reports.find(r => r.id === reportId && r.status === 'listo');
  if (!report) throw new Error('Este PDF no está disponible.');
  const parts: Uint8Array[] = [];
  // Sequential reads bound memory and quota use; no persistent client cache of PDFs.
  for (let i = 0; i < report.chunks!; i++) {
    requireOwner(uid);
    const chunk = await getDocFromServer(doc(ref, 'chunks', `${report.id}_${i}`));
    const data = chunk.data()?.data;
    if (!(data instanceof Bytes)) throw new Error('La descarga está incompleta. Volvé a intentarlo.');
    parts.push(data.toUint8Array());
  }
  const data = await assembleReport(report, parts);
  requireOwner(uid);
  return { file: report.file!, data };
}
