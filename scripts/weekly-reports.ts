import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from 'playwright';
import { preview } from 'vite';
import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { previousWeek, validatePortfolio, weeklyTargets } from '../src/lib/weeklyReports';

export async function settlePrint(page: Page, targetId: string) {
  await page.waitForFunction(id => document.querySelector('[data-weekly-ready]')?.getAttribute('data-weekly-ready') === id, targetId);
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.race([
      Promise.all(Array.from(document.querySelectorAll('img')).map(img => img.decode().catch(() => undefined))),
      new Promise(resolve => setTimeout(resolve, 10000)),
    ]);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export function reportFilename(name: string, id: string, since: string, until: string) {
  const safe = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 70) || 'Cliente';
  return `${safe(name)}_${safe(id)}_${since}_${until}.pdf`;
}

async function main() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const ownerUid = process.env.ORION_OWNER_UID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!serviceAccount || !ownerUid || !accessToken) throw new Error('Faltan FIREBASE_SERVICE_ACCOUNT, ORION_OWNER_UID o META_ACCESS_TOKEN.');
  if (!/^[\w-]{1,128}$/.test(ownerUid)) throw new Error('Identificador de cartera inválido.');
  if (process.env.GITHUB_ACTIONS && process.env.ORION_PRIVATE_RUNNER !== 'true') throw new Error('La tarea debe ejecutarse en un repositorio privado.');
  const app = initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  let portfolio;
  try {
    const document = await getFirestore(app).doc(`orionUsers/${ownerUid}/portfolio/current`).get();
    if (!document.exists) throw new Error('Guardá la cartera en Orión antes de ejecutar el informe.');
    portfolio = validatePortfolio(document.data()!.portfolio);
  } finally { await deleteApp(app); }
  const targets = weeklyTargets(portfolio);
  if (!targets.length) throw new Error('No hay clientes activos habilitados para el PDF semanal.');
  const period = previousWeek();
  const output = path.resolve('output/weekly');
  await mkdir(output, { recursive: true });
  const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const results: Array<{ clientId: string; name: string; status: string; file?: string; error?: string }> = [];
  let totalBytes = 0;
  try {
    browser = await chromium.launch({ headless: true });
    for (const target of targets) {
      const context = await browser.newContext({ timezoneId: 'America/Argentina/Buenos_Aires', locale: 'es-AR', viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      try {
        await page.goto('http://127.0.0.1:4173/#weekly-print');
        await page.waitForFunction(() => Boolean(window.orionWeekly));
        await page.evaluate(async input => { await window.orionWeekly!.load(input); }, { portfolio, targetId: target.id, period, accessToken });
        await settlePrint(page, target.id);
        const file = reportFilename(target.name, target.id, period.since, period.until);
        const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
        if (pdf.length < 1000) throw new Error('El PDF está vacío.');
        if (totalBytes + pdf.length > 60 * 1024 * 1024) throw new Error('El lote excede 60 MB. Reducí la cantidad de anuncios o dividí la cartera.');
        await writeFile(path.join(output, file), pdf);
        totalBytes += (await stat(path.join(output, file))).size;
        results.push({ clientId: target.id, name: target.name, status: 'listo', file });
      } catch {
        // Never echo browser exceptions, URLs or credentials into Actions logs.
        results.push({ clientId: target.id, name: target.name, status: 'requiere_revision', error: 'No se emitió el PDF. Revisar acceso a Meta, datos de todas las cuentas, fechas de ventas manuales y límite de tamaño; volver a ejecutar.' });
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close();
    await new Promise<void>(resolve => server.httpServer.close(() => resolve()));
  }
  await writeFile(path.join(output, 'resultado.json'), JSON.stringify({ period, generatedAt: new Date().toISOString(), results }, null, 2));
  const failed = results.filter(r => r.status !== 'listo').length;
  console.log(`Informes listos: ${results.length - failed}. Requieren revisión: ${failed}.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('No se pudo completar el lote. Verificá la configuración privada, la cartera guardada y la compilación para informes.');
    process.exitCode = 1;
  });
}
