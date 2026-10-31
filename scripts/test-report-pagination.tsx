// Dense, synthetic print regression: seven placements, automatic narrative,
// long event context, and saved UNKNOWN geography. Never includes client data.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { MonthlyReportDocument, type MonthlyReportDocumentProps } from '../src/components/reports/MonthlyReportDocument';
import type { ReportMode } from '../src/components/reports/reportData';

const directory = 'tmp/pdfs/pagination';
await fs.mkdir(directory, { recursive: true });
const assets = await fs.readdir('dist/assets');
const css = (await Promise.all(assets.filter(file => file.endsWith('.css')).map(file => fs.readFile(`dist/assets/${file}`, 'utf8')))).join('\n');
const placements = ['Facebook Feed', 'Instagram Feed', 'Facebook Reels', 'Instagram Reels', 'Instagram Stories', 'Facebook Stories', 'Audience Network'];
const counts = [150, 90, 35, 22, 15, 12, 3];
const results = counts.reduce((a, b) => a + b, 0);
const browser = await chromium.launch({ headless: true });
try {
  for (const special of [true, false]) for (const mode of ['messaging', 'leads', 'ecommerce'] as ReportMode[]) {
    const name = `${special ? 'special' : 'monthly'}-${mode}`;
    const props: MonthlyReportDocumentProps = {
      name: 'Cliente de muestra', agencyName: 'Agencia de muestra', month: '2026-10', mode,
      ...(special ? { special: { title: 'Resultados campaña de primavera', objective: 'Buscar personas interesadas en la propuesta comercial, comparar el desempeño de los anuncios y evaluar los resultados del evento.', since: '2026-10-25', until: '2026-10-29', scope: 'Campaña de mensajería especial - Lanzamiento de primavera' } } : {}),
      sections: { performance: false, assets: false, geography: true, management: false },
      metrics: { spend: 580000, messages: results, leads: results, purchases: results, revenue: 2000000, roas: 2000000 / 580000, costPerMessage: 580000 / results, costPerLead: 580000 / results, impressions: 200000, reach: 81000, clicks: 3800, ctr: 1.9, atc: 1000, currency: 'ARS' },
      daily: [], assets: [], demographics: [], placements: placements.map((label, i) => ({ name: label, rawValue: counts[i], value: counts[i] / results * 100, color: '#2563eb' })), placementBasis: mode === 'messaging' ? 'messages' : mode === 'leads' ? 'leads' : 'purchases',
      countries: [{ countryId: 'AR', spend: 579999, messages: results + 23, purchases: results + 23, leads: results + 23, revenue: 2000000 }, { countryId: 'UNKNOWN', spend: 1, messages: 0, purchases: 0, leads: 0, revenue: 0 }],
      regions: [{ countryId: 'AR', regionId: 'AR_Santa Fe', regionName: 'Santa Fe · Argentina', spend: 574000, messages: results + 19, purchases: results + 19, leads: results + 19, revenue: 2000000 }, { countryId: 'AR', regionId: 'AR_Entre Rios', regionName: 'Entre Rios · Argentina', spend: 5997, messages: 4, purchases: 4, leads: 4, revenue: 0 }, { countryId: 'AR', regionId: 'AR_Unknown', regionName: 'Unknown · Argentina', spend: 2, messages: 0, purchases: 0, leads: 0, revenue: 0 }, { countryId: 'UNKNOWN', regionId: 'UNKNOWN_Unknown', regionName: 'Unknown · UNKNOWN', spend: 1, messages: 0, purchases: 0, leads: 0, revenue: 0 }],
      texts: {}, logs: [], onUpdate: () => {}, isEditing: false,
    };
    if (special) {
      props.sections = { performance: true, assets: true, geography: true, management: true };
      props.daily = [30, 105, 90, 62, 40].map((n, i) => ({ date: (25 + i) + '/10', messages: n, purchases: n, leads: n, revenue: n * 1000, spend: n * 350 }));
      props.demographics = ['25-34', '35-44', '45-54', '55-64', '65+', 'Unknown'].map(age => ({ age, rawValue: 100, female: 60 / 6, male: 38 / 6, unknown: 2 / 6 }));
      props.assets = counts.slice(0, 5).map((n, i) => ({ id: String(i), name: 'Anuncio de muestra ' + (i + 1), thumbnail: '', messages: n, purchases: n, leads: n, revenue: n * 1000, spend: n * 350, roas: 2.85 }));
      props.logs = Array.from({ length: 12 }, (_, i) => ({
        id: String(i), date: i < 9 ? '25/10' : '29/10', source: 'Meta Ads', actor: 'Equipo de gestión', category: 'config',
        description: (i === 6 ? 'Se revisaron los anuncios y sus ubicaciones. '.repeat(5) : 'Se ajustaron las ubicaciones del conjunto de anuncios del evento.') + ' Registro ' + (i + 1) + '.',
      }));
      props.logsNotice = 'La bitácora abarca toda la cuenta; las métricas, solo las campañas elegidas.';
    }
    // Match the printable A4 content width; use the real app's report wrappers.
    const page = await browser.newPage({ viewport: { width: 699, height: 1100 } });
    await page.route('**/*', route => route.abort());
    await page.emulateMedia({ media: 'print' });
    await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"><div><main><div><div class="monthly-report-print-root ${special ? 'special-report-root' : ''}"><div>${renderToStaticMarkup(<MonthlyReportDocument {...props} />)}</div></div></div></main></div></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const overview = await page.locator('.report-sheet-overview').boundingBox();
    const limit = (297 - 15.5 - 14.5) * 96 / 25.4;
    assert.ok(overview && overview.height <= limit, `${name}: overview ${overview?.height}px exceeds A4 content ${limit}px`);
    const geography = await page.locator('.report-sheet-geography').boundingBox();
    assert.ok(geography && geography.height <= limit, `${name}: geography ${geography?.height}px exceeds A4 content ${limit}px`);
    const text = await page.locator('body').innerText();
    assert.doesNotMatch(text, /unknown/i);
    assert.match(text, /Región no informada · Argentina/);
    assert.match(text, /Ubicación no informada por Meta/);
    if (special) {
      assert.equal(await page.locator('.report-log-print tbody tr:visible').count(), 12);
      assert.equal(await page.locator('.report-timeline-path:visible').count(), 0);
      for (const sheet of ['performance', 'management']) {
        const bounds = await page.locator('.report-sheet-' + sheet).boundingBox();
        assert.ok(bounds && bounds.height <= limit, name + ': ' + sheet + ' exceeds one A4 page');
      }
    }
    await page.pdf({ path: `${directory}/${name}.pdf`, preferCSSPageSize: true, printBackground: true });
    await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
    console.log(`${name}: overview fits A4 (${Math.round(overview!.height)}px); unspecified geography explained.`);
    await page.close();
  }
} finally { await browser.close(); }
