import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Bytes, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-weekly-downloads', firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
try {
  const owner = env.authenticatedContext('owner').firestore();
  const other = env.authenticatedContext('other').firestore();
  const anon = env.unauthenticatedContext().firestore();
  const publisher = env.authenticatedContext('orion-weekly-publisher', { weeklyReportsOwner: 'owner' }).firestore();
  const wrongPublisher = env.authenticatedContext('orion-weekly-publisher', { weeklyReportsOwner: 'other' }).firestore();
  const forgedClaim = env.authenticatedContext('other', { weeklyReportsOwner: 'owner' }).firestore();
  const base = 'orionUsers/owner/weeklyReports/week';
  await assertSucceeds(setDoc(doc(publisher, base), { status: 'uploading' }));
  await assertSucceeds(setDoc(doc(publisher, base, 'chunks/part'), { data: Bytes.fromUint8Array(new Uint8Array([1, 2, 3])) }));
  await assertFails(getDoc(doc(owner, base, 'chunks/part')));
  await assertSucceeds(setDoc(doc(publisher, base), { status: 'ready' }));
  await assertSucceeds(getDoc(doc(owner, base)));
  await assertSucceeds(getDocs(collection(owner, 'orionUsers/owner/weeklyReports')));
  await assertSucceeds(getDoc(doc(owner, base, 'chunks/part')));
  for (const db of [other, anon, wrongPublisher, forgedClaim]) {
    await assertFails(getDoc(doc(db, base)));
    await assertFails(getDoc(doc(db, base, 'chunks/part')));
    await assertFails(setDoc(doc(db, base), { status: 'ready' }));
  }
  await assertFails(setDoc(doc(owner, base), { status: 'ready' }));
  await assertFails(deleteDoc(doc(owner, base)));
  await assertFails(setDoc(doc(publisher, 'orionUsers/owner/portfolio/current'), { portfolio: { version: 1 }, revision: 1, updatedAt: 'now' }));
  await assertFails(setDoc(doc(publisher, 'orionUsers/owner/clients/a/offline_sales/a'), { amount: 1, date: '2026-10-23' }));
  await assertSucceeds(deleteDoc(doc(publisher, base, 'chunks/part')));
  await assertSucceeds(deleteDoc(doc(publisher, base)));
  console.log('Private report rules: owner isolation, publisher scope and incomplete uploads verified.');
} finally { await env.cleanup(); }
