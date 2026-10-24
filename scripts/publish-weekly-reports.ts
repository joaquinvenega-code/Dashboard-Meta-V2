import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { cert, initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { Bytes, collection, doc, getDocs, getFirestore, setDoc, deleteDoc, terminate } from 'firebase/firestore';
import webConfig from '../src/firebase-applet-config.json';
import { REPORT_BATCH_BYTES, REPORT_CHUNK_BYTES, REPORT_PUBLISHER_UID, REPORT_RETENTION_DAYS, validDownloadId, validateDownloadBatch, type DownloadBatch } from '../src/lib/weeklyDownloads';

export interface ReportArchiveStore {
  list(): Promise<DownloadBatch[]>;
  saveBatch(batch: DownloadBatch): Promise<void>;
  saveChunk(batchId: string, chunkId: string, data: Uint8Array): Promise<void>;
  removeBatch(batchId: string): Promise<void>;
}
export async function publishArchive(store: ReportArchiveStore, batch: DownloadBatch, files: Map<string, Uint8Array>, now = Date.now()) {
  validateDownloadBatch(batch.id, batch);
  // Validate all bytes before publishing anything; failures leave the prior batch usable.
  for (const report of batch.reports.filter(r => r.status === 'listo')) {
    const file = files.get(report.id);
    if (!file || file.length !== report.bytes || createHash('sha256').update(file).digest('hex') !== report.sha256
      || new TextDecoder().decode(file.slice(0, 5)) !== '%PDF-') throw new Error('Archivo inválido.');
  }
  let existing = await store.list();
  for (const item of existing) {
    if (Date.parse(item.expiresAt) <= now || (item.status === 'uploading' && Date.parse(item.generatedAt) < now - 86400000)) await store.removeBatch(item.id);
  }
  existing = await store.list();
  const used = existing.reduce((sum, b) => sum + b.reports.reduce((n, r) => n + (r.bytes || 0), 0), 0);
  const incoming = batch.reports.reduce((n, r) => n + (r.bytes || 0), 0);
  if (used + incoming > REPORT_BATCH_BYTES * 5) throw new Error('Se alcanzó el límite de almacenamiento de informes.');
  await store.saveBatch({ ...batch, status: 'uploading' });
  for (const report of batch.reports.filter(r => r.status === 'listo')) {
    const file = files.get(report.id)!;
    for (let i = 0; i < report.chunks!; i++) await store.saveChunk(batch.id, `${report.id}_${i}`, file.slice(i * REPORT_CHUNK_BYTES, (i + 1) * REPORT_CHUNK_BYTES));
  }
  await store.saveBatch({ ...batch, status: 'ready' });
  // Only switch the visible week after every chunk is durable. Remove old versions afterwards.
  const all = (await store.list()).filter(b => b.status === 'ready').sort((a, b) => b.since.localeCompare(a.since)
    || (a.id === batch.id ? -1 : b.id === batch.id ? 1 : b.generatedAt.localeCompare(a.generatedAt)));
  const weeks = new Set<string>();
  for (const item of all) {
    if (weeks.has(item.since) || weeks.size >= 4) await store.removeBatch(item.id);
    else weeks.add(item.since);
  }
}

export async function prepareArchive(directory: string, now = new Date()) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'resultado.json'), 'utf8'));
  if (!Array.isArray(manifest.results) || manifest.results.length > 300) throw new Error('Listado inválido.');
  const files = new Map<string, Uint8Array>();
  const reports: DownloadBatch['reports'] = [];
  let total = 0;
  for (let i = 0; i < manifest.results.length; i++) {
    const r = manifest.results[i];
    const id = `pdf_${i}`;
    if (r.status === 'listo') {
      if (typeof r.file !== 'string' || !/^[a-zA-Z0-9_-]+\.pdf$/.test(r.file)) throw new Error('Nombre inválido.');
      const data = new Uint8Array(await readFile(path.join(directory, r.file)));
      total += data.length;
      if (total > REPORT_BATCH_BYTES) throw new Error('Lote demasiado grande.');
      files.set(id, data);
      reports.push({ id, clientId: r.clientId, name: r.name, status: 'listo', file: r.file, bytes: data.length, chunks: Math.ceil(data.length / REPORT_CHUNK_BYTES), sha256: createHash('sha256').update(data).digest('hex') });
    } else reports.push({ id, clientId: r.clientId, name: r.name, status: 'requiere_revision' });
  }
  const batch: DownloadBatch = { id: `${manifest.period.since}_${randomUUID()}`, since: manifest.period.since, until: manifest.period.until,
    generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + REPORT_RETENTION_DAYS * 86400000).toISOString(), status: 'uploading', reports };
  validateDownloadBatch(batch.id, batch);
  return { batch, files };
}

async function main() {
  if (process.env.ORION_PRIVATE_RUNNER !== 'true') throw new Error('Solo se publica desde la tarea privada.');
  const owner = process.env.ORION_OWNER_UID;
  if (!validDownloadId(owner)) throw new Error('Identificador inválido.');
  const credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (credential.project_id !== webConfig.projectId) throw new Error('El proyecto no coincide.');
  const { batch, files } = await prepareArchive(path.resolve('output/weekly'));
  const admin = initializeAdmin({ credential: cert(credential) }, 'weekly-publisher-signer');
  const app = initializeApp(webConfig, 'weekly-publisher');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const db = getFirestore(app);
  try {
    // Separate identity: this token can write only its owner's report archive through rules.
    // The service account retains its read-only IAM role; no broad database writer role.
    const token = await getAdminAuth(admin).createCustomToken(REPORT_PUBLISHER_UID, { weeklyReportsOwner: owner });
    await signInWithCustomToken(auth, token);
    const batches = collection(db, 'orionUsers', owner, 'weeklyReports');
    const store: ReportArchiveStore = {
      async list() { return (await getDocs(batches)).docs.map(d => validateDownloadBatch(d.id, d.data())); },
      async saveBatch(b) { await setDoc(doc(batches, b.id), b); },
      async saveChunk(id, chunkId, data) { await setDoc(doc(batches, id, 'chunks', chunkId), { data: Bytes.fromUint8Array(data) }); },
      async removeBatch(id) {
        const ref = doc(batches, id);
        const chunks = await getDocs(collection(ref, 'chunks'));
        for (const chunk of chunks.docs) await deleteDoc(chunk.ref);
        await deleteDoc(ref);
      },
    };
    await publishArchive(store, batch, files);
    console.log(`Descargas privadas disponibles: ${batch.reports.filter(r => r.status === 'listo').length}.`);
  } finally {
    await signOut(auth); await terminate(db); await deleteApp(app); await deleteAdmin(admin);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => {
  console.error('No se pudo publicar la descarga en Orión. Los PDF siguen disponibles en el archivo privado de esta ejecución.');
  process.exitCode = 1;
});
