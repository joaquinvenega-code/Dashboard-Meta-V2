// Build with VITE_REPORT_RUNNER=true. No live Meta/Firebase credentials.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { settlePrint } from './weekly-reports';
import { trackingMetrics } from '../src/lib/weeklyReports';
import type { WeeklySnapshot } from '../src/lib/weeklySnapshot';

await mkdir('tmp/pdfs/thumbnail-quality', { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  for (const tracking of ['messaging', 'ecommerce', 'both'] as const) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.route('https://graph.facebook.com/**', route => route.abort());
    await page.goto('http://127.0.0.1:4173/#weekly-print');
    await page.waitForFunction(() => Boolean(window.orionWeekly));
    const images = await page.evaluate(() => {
      const result: Record<string, string> = {};
      for (const size of [64, 1024]) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#155e75'; ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = size / 200;
        for (let i = 0; i < 20; i++) { ctx.strokeRect(i * size / 20, 0, size / 20, size); }
        ctx.fillStyle = 'white'; ctx.font = `${size / 14}px sans-serif`;
        ctx.fillText('PRUEBA DE CALIDAD', size / 12, size / 2);
        result[size === 64 ? 'low' : 'high'] = canvas.toDataURL('image/png');
      }
      return result;
    });
    const id = `quality_${tracking}`;
    const snapshot: WeeklySnapshot = {
      account: { id, account_id: 'PRUEBA', name: 'Prueba de miniaturas', account_status: 1, currency: 'ARS', spend: 3000, purchases: 30, revenue: 9000, messages: 30, ctr: 1, clicks: 100, impressions: 10000 },
      portfolio: { version: 1, groups: [], categories: [], visibleAccountIds: [id], notes: [], settings: {
        [id]: { objective: 0, budget: 3000, currency: 'ARS', tracking, visibleMetrics: trackingMetrics(tracking), activeClient: true, weeklyReportEnabled: true, detailReport: { topN: 3, sortBy: 'spend', showMetrics: true, showObservations: false } },
      } },
      period: { since: '2026-11-02', until: '2026-11-08' }, daily: [], activity: { logs: [], automatic: [], notice: '' },
      ads: ['Solo miniatura pequeña', 'Imagen nítida', 'Recuperada desde original'].map((name, i) => ({
        id: `ad${i}`, name, spend: 1000, purchases: 10, revenue: 3000, messages: 10, ctr: 1, roas: 3,
        thumbnail: i === 1 ? images.high : images.low,
        originalThumbnailUrl: i === 2 ? images.high : i === 1 ? images.high : images.low,
        previewUrl: null,
      })),
    };
    await page.evaluate(data => window.orionWeekly!.preview(data), snapshot);
    const issues = await settlePrint(page, id);
    assert.deepEqual(issues, [{ index: 0, reason: 'low_resolution', width: 64, height: 64 }]);
    assert.equal(await page.locator('.ad-card-print-media img').first().isVisible(), false);
    assert.match(await page.locator('.ad-card-print-media').first().innerText(), /Miniatura sin alta resolución/i);
    const widths = await page.locator('.ad-card-print-media img').evaluateAll(imgs => imgs.slice(1).map(img => (img as HTMLImageElement).naturalWidth));
    assert.deepEqual(widths, [1024, 1024]);
    assert.equal(await page.locator('.ad-card-print').count(), 3, 'Quality checks must preserve every ad and its metrics');
    assert.match(await page.locator('body').innerText(), /3\.000/);
    await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, path: `tmp/pdfs/thumbnail-quality/${tracking}.pdf` });
    await page.screenshot({ path: `tmp/pdfs/thumbnail-quality/${tracking}.png`, fullPage: true });
    await page.close();
    console.log(`Thumbnail quality ${tracking}: OK (64 px rejected, 1024 px retained and recovered)`);
  }
} finally {
  await browser?.close();
  await new Promise<void>(resolve => server.httpServer.close(() => resolve()));
}
