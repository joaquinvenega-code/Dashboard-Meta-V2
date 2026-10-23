// Deterministic end-to-end QA of the real Detail component. No live credentials.
// Build with VITE_REPORT_RUNNER=true, then run npm run test:weekly-print.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { settlePrint } from './weekly-reports';
import { trackingMetrics } from '../src/lib/weeklyReports';
import type { WeeklySnapshot } from '../src/lib/weeklySnapshot';

await fs.mkdir('tmp/pdfs/weekly', { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
const browser = await chromium.launch({ headless: true });
try {
  for (const tracking of ['messaging', 'ecommerce', 'both'] as const) {
    const id = `fixture_${tracking}`;
    const daily = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${12 + i}`, spend: 1000 + i * 100, purchases: 2 + i, revenue: 8000 + i * 1000, messages: 10 + i, roas: 8 }));
    const snapshot: WeeklySnapshot = {
      account: { id, account_id: 'PRUEBA', name: `Cliente de prueba - ${tracking}`, account_status: 1, currency: 'ARS', spend: 9100, purchases: 35, revenue: 77000, messages: 91, messagesReal: 91, costPerMessage: 100, costPerMessageReal: 100, ctr: 1.5, clicks: 150, impressions: 10000 },
      portfolio: { version: 1, settings: { [id]: { objective: 100000, budget: 25000, currency: 'ARS', tracking, visibleMetrics: trackingMetrics(tracking), activeClient: true, weeklyReportEnabled: true, detailReport: { topN: 3, sortBy: tracking === 'messaging' ? 'messages' : 'roas', showMetrics: true, showObservations: false } } }, groups: [], categories: [], visibleAccountIds: [id], notes: [
        { id: 'in', accountId: id, timestamp: '2026-10-14T12:00:00Z', text: 'NOTA_DENTRO: Revisión semanal de resultados.', category: 'observation' },
        { id: 'out', accountId: id, timestamp: '2026-10-01T12:00:00Z', text: 'NOTA_FUERA: No debe imprimirse.', category: 'observation' },
      ] },
      period: { since: '2026-10-12', until: '2026-10-18' }, daily,
      ads: Array.from({ length: 3 }, (_, i) => ({ id: `ad${i}`, name: `Anuncio de prueba ${i + 1}`, spend: 2000, purchases: 10, revenue: 15000, messages: 20, ctr: 1.5, roas: 7.5,
        thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${['#1e3a8a', '#155e75', '#5b21b6'][i]}"/><text x="300" y="280" fill="white" text-anchor="middle" font-family="Arial" font-size="36">DATOS DE PRUEBA</text><text x="300" y="335" fill="white" text-anchor="middle" font-family="Arial" font-size="24">Anuncio ${i + 1}</text></svg>`), previewUrl: 'https://www.facebook.com/', dailySeries: daily })),
      activity: { logs: [], automatic: [], notice: '' },
    };
    snapshot.account.revenue = 4100000;
    snapshot.portfolio.settings[id].customLogo = 'data:image/png;base64,invalid';
    snapshot.ads[0].name = 'Anuncio con nombre largo para comprobar que el indicador de orden no tapa el titulo del creativo';
    const context = await browser.newContext({ timezoneId: 'America/Argentina/Buenos_Aires', viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let metaRequests = 0;
    await page.route('https://graph.facebook.com/**', route => { metaRequests++; return route.abort(); });
    await page.goto('http://127.0.0.1:4173/#weekly-print');
    await page.waitForFunction(() => Boolean(window.orionWeekly));
    await page.evaluate(data => window.orionWeekly!.preview(data), snapshot);
    await settlePrint(page, id);
    const content = await page.locator('body').innerText();
    assert.match(content, /NOTA_DENTRO/); assert.doesNotMatch(content, /NOTA_FUERA/);
    assert.match(content, /12\/10\/2026 - 18\/10\/2026/);
    assert.match(content, tracking === 'both' ? /Ecommerce \+ mensajería/ : tracking === 'messaging' ? /Mensajería/ : /Ecommerce web/);
    assert.equal(metaRequests, 0, 'Snapshots must not refetch Meta while printing');
    const metricsFit = await page.locator('.detail-metrics-content').evaluate(element => element.clientHeight >= element.scrollHeight - 1);
    assert.ok(metricsFit, 'Every KPI row must remain visible while printing during expansion');
    const valuesFit = await page.locator('.print-metrics-grid .truncate').evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(valuesFit, 'Large amounts must print in full without horizontal truncation');
    assert.equal(await page.locator('.report-print-logo').isVisible(), false, 'Broken logos must not print');
    const rankDoesNotOverlap = await page.locator('.ad-card-print').evaluateAll(cards => cards.every(card => {
      const rank = card.querySelector('.print-rank')!.getBoundingClientRect();
      const layout = card.querySelector('.ad-card-print-layout')!.getBoundingClientRect();
      return rank.bottom <= layout.top;
    }));
    assert.ok(rankDoesNotOverlap, 'Creative rank must not obscure titles');
    assert.deepEqual(errors, []);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, path: `tmp/pdfs/weekly/${tracking}.pdf` });
    assert.ok(pdf.length > 10000);
    await page.screenshot({ path: `tmp/pdfs/weekly/${tracking}.png`, fullPage: true });
    await context.close();
    console.log(`PDF ${tracking}: OK`);
  }
} finally {
  await browser.close();
  await new Promise<void>(resolve => server.httpServer.close(() => resolve()));
}
