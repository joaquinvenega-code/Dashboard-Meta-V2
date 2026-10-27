import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assembleReport, hasCompletedWeek, REPORT_CHUNK_BYTES, validateDownloadBatch, type DownloadBatch } from './weeklyDownloads';
import { publishArchive, type ReportArchiveStore } from '../../scripts/publish-weekly-reports';

const pdf = new Uint8Array(REPORT_CHUNK_BYTES + 50).fill(32);
pdf.set(new TextEncoder().encode('%PDF-1.7\n'));
const batch = (id = 'new', since = '2026-10-12'): DownloadBatch => ({ id, since, until: '2026-10-18', generatedAt: '2026-10-23T12:00:00Z', expiresAt: '2026-11-20T12:00:00Z', status: 'ready', reports: [{ id: 'pdf_0', clientId: 'test', name: 'Cliente de prueba', status: 'listo', file: 'cliente.pdf', bytes: pdf.length, chunks: 2, sha256: createHash('sha256').update(pdf).digest('hex') }] });
function memoryStore(initial: DownloadBatch[] = []) {
  const records = new Map(initial.map(b => [b.id, b]));
  const parts = new Map<string, Uint8Array>();
  const store: ReportArchiveStore = {
    async list() { return [...records.values()]; },
    async saveBatch(b) { records.set(b.id, structuredClone(b)); },
    async saveChunk(id, chunkId, bytes) { parts.set(`${id}/${chunkId}`, bytes); },
    async removeBatch(id) { records.delete(id); for (const key of parts.keys()) if (key.startsWith(id + '/')) parts.delete(key); },
  };
  return { store, records, parts };
}
test('scheduled retry skips only a ready, unexpired matching week with all selected clients', () => {
  const b = batch();
  const period = { since: b.since, until: b.until };
  const now = Date.parse('2026-10-26T09:17:00Z');
  const complete = (items: DownloadBatch[], ids = ['test']) => hasCompletedWeek(items, period, ids, now);
  assert.equal(complete([b]), true);
  assert.equal(complete([]), false);
  assert.equal(complete([b], []), false);
  assert.equal(complete([b], ['test', 'new-client']), false);
  assert.equal(complete([{ ...b, status: 'uploading' }]), false);
  assert.equal(complete([{ ...b, since: '2026-10-05' }]), false);
  assert.equal(complete([{ ...b, until: '2026-10-19' }]), false);
  assert.equal(complete([{ ...b, expiresAt: '2026-10-26T09:17:00Z' }]), false);
  assert.equal(complete([{ ...b, reports: [{ ...b.reports[0], status: 'requiere_revision' }] }]), false);
});

test('reassembles the exact PDF and rejects missing, corrupted or reordered chunks', async () => {
  const r = batch().reports[0];
  const parts = [pdf.slice(0, REPORT_CHUNK_BYTES), pdf.slice(REPORT_CHUNK_BYTES)];
  assert.deepEqual(await assembleReport(r, parts), pdf);
  await assert.rejects(assembleReport(r, parts.slice(0, 1)));
  await assert.rejects(assembleReport(r, [...parts].reverse()));
  const corrupted = parts.map(p => p.slice()); corrupted[0][20] = 99;
  await assert.rejects(assembleReport(r, corrupted));
});
test('rejects unsafe filenames, oversized data and duplicate report ids', () => {
  const b = batch(); b.reports[0].file = '../private.pdf';
  assert.throws(() => validateDownloadBatch(b.id, b));
  const huge = batch(); huge.reports[0].bytes = 1e10;
  assert.throws(() => validateDownloadBatch(huge.id, huge));
  const duplicate = batch(); duplicate.reports.push(duplicate.reports[0]);
  assert.throws(() => validateDownloadBatch(duplicate.id, duplicate));
});
test('failed upload never replaces the previously downloadable week', async () => {
  const { store, records } = memoryStore([batch('old')]);
  store.saveChunk = async () => { throw new Error('network'); };
  await assert.rejects(publishArchive(store, batch(), new Map([['pdf_0', pdf]]), Date.parse('2026-10-23')));
  assert.equal(records.get('old')?.status, 'ready');
  assert.equal(records.get('new')?.status, 'uploading');
});
test('successful publish switches the week after all chunks and cleans superseded data', async () => {
  const { store, records, parts } = memoryStore([batch('old')]);
  await publishArchive(store, batch(), new Map([['pdf_0', pdf]]), Date.parse('2026-10-23'));
  assert.equal(records.get('new')?.status, 'ready'); assert.ok(!records.has('old'));
  assert.deepEqual(await assembleReport(batch().reports[0], [parts.get('new/pdf_0_0')!, parts.get('new/pdf_0_1')!]), pdf);
});
test('keeps only four weeks and cleans abandoned uploads', async () => {
  const old = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].map((date, i) => batch(`old${i}`, date));
  old.push({ ...batch('abandoned'), status: 'uploading', generatedAt: '2026-10-20T12:00:00Z' });
  const { store, records } = memoryStore(old);
  await publishArchive(store, batch(), new Map([['pdf_0', pdf]]), Date.parse('2026-10-23'));
  assert.equal(records.size, 4); assert.ok(!records.has('old0')); assert.ok(!records.has('abandoned'));
});
