// Synthetic UI + PDF regression; no real account credentials or data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const directory = 'tmp/special-reports-qa';
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(`${directory}/index.html`, '<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./preview.tsx"></script></body></html>');
await fs.writeFile(`${directory}/preview.tsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {SpecialReports} from '../../src/components/SpecialReports';
import {ReportsHub} from '../../src/components/ReportsHub';
import {Sidebar} from '../../src/components/Sidebar';
import type {ReportTab} from '../../src/lib/reportTabs';
import {ReportsSection} from '../../src/components/ReportsSection';
import {setFacebookAccessToken} from '../../src/services/facebook';
import '../../src/index.css';
setFacebookAccessToken('synthetic-qa-token');
const accounts = [{id:'act_1',account_id:'1',name:'Cliente de prueba',currency:'ARS',account_status:1}];
const settings = {act_1:{objective:0,budget:0,currency:'ARS',tracking:'ecommerce' as const,activeClient:true}};
const notes = [{id:'inside',accountId:'act_1',timestamp:'2026-02-01T12:00:00',text:'Nota del evento conservada',category:'observation' as const}, {id:'outside',accountId:'act_1',timestamp:'2026-01-02T12:00:00',text:'NOTA FUERA DEL PERIODO',category:'observation' as const}];
const props={accounts,settings,visibleAccountIds:['act_1'],notes,agencySettings:{agencyName:'Agencia de prueba',logoUrl:''}};
const cloud={uid:'',ready:false,checking:false,busy:false,status:'',hasRemote:false,synced:false,load:async()=>{},save:async()=>{},setStatus:()=>{}};
function Fixture() {
  const [page,setPage] = React.useState('overview');
  const [tab,setTab] = React.useState<ReportTab>('weekly');
  return <div className="min-h-screen flex flex-col lg:flex-row">
    <Sidebar activePage={page} onPageChange={setPage} reportTab={tab} onReportTabChange={setTab} user={null} lastSync={null} onLogout={()=>{}} onRefresh={()=>{}}/>
    <main className="min-w-0 flex-1 p-4 sm:p-8"><div className="mx-auto max-w-6xl">{page==='reports' && <ReportsHub tab={tab} onTabChange={setTab} {...props} groups={[]} categories={[]} cloud={cloud} onSettingsChange={()=>{}} onManageClients={()=>{}} specialReports={<SpecialReports {...props}/>}><ReportsSection {...props}/></ReportsHub>}</div></main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
`);
const server = await createServer({ server: { host: '127.0.0.1', port: 4181, strictPort: true }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ timezoneId: 'America/Argentina/Buenos_Aires', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let metaRequests = 0;
  const scopes: string[] = [];
  await page.route('https://graph.facebook.com/**', route => {
    metaRequests++;
    const url = new URL(route.request().url()), p = url.searchParams;
    const base = { spend: '12000', reach: '300', clicks: '60', impressions: '600', actions: [{ action_type: 'purchase', value: '3' }, { action_type: 'add_to_cart', value: '10' }], action_values: [{ action_type: 'purchase', value: '60000' }] };
    let payload: object = { data: [] };
    if (url.pathname.endsWith('/campaigns')) payload = { data: [{ id: '11', name: 'Lanzamiento de verano' }, { id: '22', name: 'Campaña permanente' }] };
    else if (url.pathname.endsWith('/insights')) {
      scopes.push(p.get('filtering') || '');
      if (p.get('level') === 'ad') payload = { data: [{ ...base, ad_id: '101', ad_name: 'Anuncio del lanzamiento' }] };
      else if (p.get('time_increment')) payload = { data: [{ ...base, date_start: '2026-01-30' }] };
      else if (p.get('breakdowns') === 'age,gender') payload = { data: [{ ...base, age: '25-34', gender: 'female' }] };
      else if (p.get('breakdowns') === 'country,region') payload = { data: [{ ...base, country: 'AR', region: 'Buenos Aires' }] };
      else if (p.has('breakdowns')) payload = { data: [{ ...base, publisher_platform: 'instagram', platform_position: 'feed' }] };
      else payload = { data: [base] };
    } else if (url.pathname.endsWith('/act_1')) payload = { currency: 'ARS', timezone_name: 'America/Argentina/Buenos_Aires' };
    else if (p.get('fields') === 'preview_shareable_link') payload = { preview_shareable_link: 'https://fb.me/adspreview/synthetic' };
    else if (p.get('fields')?.startsWith('creative')) payload = { creative: { image_url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#2563eb"/><text x="40" y="200" fill="white" font-size="24">DATOS DE PRUEBA</text></svg>') } };
    return route.fulfill({ json: payload });
  });
  await page.route('**/api/bitacora/**', route => route.fulfill({ json: { success: true, data: [] } }));
  await page.goto('http://127.0.0.1:4181/tmp/special-reports-qa/index.html');
  const nav = (name: string) => page.getByRole('button', { name, exact: true });
  async function enterSpecial() {
    if (await nav('Abrir menú').isVisible()) await nav('Abrir menú').click();
    await nav('Informes').click();
    await nav('Especiales').click();
    assert.equal(await page.getByRole('tab', { name: /Especiales/ }).getAttribute('aria-selected'), 'true');
  }
  await nav('Contraer panel lateral').click();
  await enterSpecial();
  await page.getByRole('tab', { name: /Semanales/ }).click();
  assert.equal(await nav('Semanales').getAttribute('aria-current'), 'page');
  await nav('Especiales').click();
  await page.getByRole('button', { name: 'Nuevo informe' }).click();
  await page.getByLabel('Nombre del informe').fill('Lanzamiento de verano');
  await page.getByLabel('Desde', { exact: true }).fill('2026-01-30');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-02-02');
  await page.getByLabel(/Objetivo del evento/).fill('Evaluar las compras y el retorno de la promoción.');
  await page.getByLabel('Campañas específicas', { exact: true }).check();
  await page.getByLabel('Lanzamiento de verano', { exact: true }).check();
  // A pause in editing saves the draft automatically.
  await page.getByText('Borrador guardado', { exact: true }).waitFor();
  await page.reload();
  await enterSpecial();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  assert.equal(await page.getByLabel('Nombre del informe').inputValue(), 'Lanzamiento de verano');
  await page.screenshot({ path: `${directory}/configuration.png`, fullPage: true });
  await page.getByRole('button', { name: 'Generar vista previa', exact: true }).click();
  await page.getByLabel('Conclusión del evento').waitFor({ timeout: 60000 });
  assert.ok(scopes.length >= 6);
  for (const scope of scopes) assert.deepEqual(JSON.parse(scope), [{ field: 'campaign.id', operator: 'IN', value: ['11'] }]);
  await page.getByLabel('Conclusión del evento').fill('Las compras se concentraron en el lanzamiento. Análisis revisado para el cliente.');
  await page.getByLabel('Aprendizajes', { exact: true }).fill('Repetir el enfoque creativo en la próxima edición.');
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByText('Finalizado · Copia guardada', { exact: true }).waitFor();
  const reportDocument = page.locator('#reports-special .report-editorial');
  const text = await reportDocument.innerText();
  assert.match(text, /30\/01\/2026.*02\/02\/2026/);
  assert.match(text, /Nota del evento conservada/); assert.doesNotMatch(text, /NOTA FUERA DEL PERIODO/);
  assert.match(text, /bitácora abarca toda la cuenta/);
  assert.equal(await reportDocument.getByText('Claves de lectura', { exact: true }).count(), 1);
  assert.doesNotMatch(text, /Cómo interpretar la conversión/);
  assert.match(text, /Análisis revisado para el cliente/);
  assert.equal(await reportDocument.locator('textarea').count(), 0);
  assert.equal(await reportDocument.getByText('Ordenar', { exact: false }).count(), 0);
  await page.screenshot({ path: `${directory}/preview.png`, fullPage: true });
  const beforeReload = metaRequests;
  await page.reload();
  await enterSpecial();
  await page.getByRole('button', { name: 'Ver informe', exact: true }).click();
  assert.equal(await reportDocument.innerText(), text);
  assert.equal(metaRequests, beforeReload, 'Finalized reports must not refetch metrics');
  const immutable = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only import from the test origin.
    const storage = await import('/src/lib/specialReports.ts');
    const record = (await storage.listSpecialReports())[0];
    try { await storage.saveSpecialReport({ ...record, status: 'draft', title: 'Stale tab overwrite' }); return false; }
    catch { return (await storage.listSpecialReports())[0].status === 'final'; }
  });
  assert.equal(immutable, true, 'A stale tab cannot overwrite a finalized report');
  await page.evaluate(() => { window.print = () => { (window as any).printedTitle = document.title; }; });
  await page.getByRole('button', { name: 'Imprimir / Guardar PDF', exact: true }).click();
  await page.waitForFunction(() => Boolean((window as any).printedTitle));
  assert.equal(await page.evaluate(() => (window as any).printedTitle), 'Cliente de prueba - Lanzamiento de verano');
  // Mount the monthly tab, then return. Only the active document may print.
  await nav('Mensuales').click();
  assert.equal(await page.getByRole('tab', { name: /Mensuales/ }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: /Especiales/ }).click();
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#reports-monthly').isVisible(), false);
  assert.equal(await page.locator('#reports-weekly').isVisible(), false);
  assert.equal(await reportDocument.isVisible(), true);
  const pdf = await page.pdf({ path: `${directory}/special-report.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
  assert.ok(pdf.length > 10000);
  await page.screenshot({ path: `${directory}/print.png`, fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await page.screenshot({ path: `${directory}/mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.getByRole('button', { name: /Duplicar Lanzamiento/ }).click();
  assert.equal(await page.getByLabel('Nombre del informe').inputValue(), 'Lanzamiento de verano (copia)');
  await page.getByLabel('Toda la cuenta', { exact: true }).check();
  await page.getByLabel('Evolución y audiencias', { exact: true }).uncheck();
  await page.getByLabel('Creatividades', { exact: true }).uncheck();
  await page.getByLabel('Distribución geográfica', { exact: true }).uncheck();
  await page.getByLabel('Bitácora y conclusiones', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Generar vista previa', exact: true }).click();
  await page.getByLabel('Conclusión del evento').waitFor();
  assert.equal(await reportDocument.locator('.report-sheet').count(), 1);
  assert.ok(scopes.slice(-3).every(scope => scope === ''), 'All-account report explicitly removes campaign filters');
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Eliminar borrador: Lanzamiento de verano (copia)', exact: true });
  const staleDraft = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only import from the test origin.
    const storage = await import('/src/lib/specialReports.ts');
    return (await storage.listSpecialReports()).find((item: { status: string }) => item.status === 'draft');
  });
  page.once('dialog', async dialog => { assert.match(dialog.message(), /Lanzamiento de verano \(copia\)/); await dialog.dismiss(); });
  await remove.click();
  assert.ok(await remove.isVisible(), 'Cancel keeps the draft');
  page.once('dialog', dialog => dialog.accept());
  await remove.click();
  await remove.waitFor({ state: 'detached' });
  await page.reload();
  await enterSpecial();
  assert.equal(await page.getByRole('dialog', { name: 'Menú principal' }).count(), 0);
  await page.getByRole('button', { name: 'Ver informe', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Eliminar borrador/ }).count(), 0);
  const protectedLibrary = await page.evaluate(async draft => {
    // @ts-expect-error Vite serves this browser-only import from the test origin.
    const storage = await import('/src/lib/specialReports.ts');
    const [final] = await storage.listSpecialReports();
    const attempts = await Promise.allSettled([storage.saveSpecialReport(draft), storage.deleteSpecialDraft(final.id)]);
    return [attempts.map(result => result.status), (await storage.listSpecialReports()).map((item: { id: string }) => item.id), final.id];
  }, staleDraft);
  assert.deepEqual(protectedLibrary.slice(0, 2), [['rejected', 'rejected'], [protectedLibrary[2]]]);
  assert.deepEqual(errors, []);
  console.log('Special reports: draft reload, scoped requests, final snapshot, duplication, selected sections, mobile and PDF OK.');
  await context.close();
} finally { await browser.close(); await server.close(); }
