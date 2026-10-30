import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { duplicateSpecialReport, finalizeSpecialReport, reportValidation, specialDailySeries, type SpecialReport } from './specialReports';
import { reportCampaignFilter } from './reportScope';
import { collectReportLogs } from '../components/reports/reportLogs';
import { MonthlyReportDocument } from '../components/reports/MonthlyReportDocument';
import { reportPeriodMetrics } from '../components/reports/reportData';

export const reportFixture: SpecialReport = {
  version: 1, id: 'fixture', status: 'draft', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  accountId: 'act_1', clientName: 'Cliente de prueba', title: 'Lanzamiento', objective: 'Evaluar resultados',
  since: '2025-12-30', until: '2026-01-02', mode: 'leads', theme: 'light', scope: 'campaigns', campaigns: [{ id: '123', name: 'Campaña del evento' }],
  sections: { performance: true, assets: true, geography: true, management: true }, texts: { narrative: 'Análisis conservado' },
};
test('special periods span months and years without inventing missing daily values', () => {
  const points = specialDailySeries([{ date: '2025-12-31', spend: 5, leads: 2 }, { date: '2026-01-01', spend: 0, leads: 0 }, { date: '2026-01-05', spend: 999 }], reportFixture.since, reportFixture.until);
  assert.deepEqual(points.map(p => p.date), ['30/12/25', '31/12/25', '01/01/26', '02/01/26']);
  assert.deepEqual(points.map(p => p.spend), [null, 5, 0, null]);
  assert.equal(specialDailySeries([{ date: '2026-01-01', leads: 1 }], '2026-01-01', '2026-01-01').length, 1);
});
test('invalid dates and empty campaign selections cannot generate unfiltered reports', () => {
  assert.equal(reportValidation(reportFixture), '');
  for (const patch of [{ since: '2026-02-30' }, { since: '2026-02-02' }, { until: '2099-01-01' }, { title: ' ' }, { campaigns: [] }]) assert.ok(reportValidation({ ...reportFixture, ...patch }));
  assert.deepEqual(reportCampaignFilter(), {});
  assert.throws(() => reportCampaignFilter([]));
  assert.throws(() => reportCampaignFilter(['not-an-id']));
  assert.deepEqual(JSON.parse(reportCampaignFilter(['123', '123']).filtering!), [{ field: 'campaign.id', operator: 'IN', value: ['123'] }]);
});
test('notes use exact inclusive dates across month boundaries', () => {
  const notes = ['2025-12-29', '2025-12-30', '2026-01-02', '2026-01-03'].map((date, i) => ({ id: String(i), accountId: 'act_1', timestamp: date + 'T12:00:00', text: date, category: 'observation' as const }));
  assert.deepEqual(collectReportLogs(notes, [], 'act_1', reportFixture.since, reportFixture.until).logs.map(l => l.description), ['2025-12-30', '2026-01-02']);
  assert.equal(collectReportLogs(notes, [], 'act_1', '2025-12').logs.length, 2);
});
test('final snapshots isolate data and text; duplicates require regeneration', () => {
  assert.throws(() => finalizeSpecialReport(reportFixture), /Generá/);
  const snapshot = { name: 'Cliente', month: '2025-12', mode: 'leads' as const, metrics: reportPeriodMetrics({ spend: 100, reach: 20 }, [], 'ARS'), dataAvailable: true, daily: [], assets: [], demographics: [], countries: [], regions: [], placements: [], placementBasis: 'spend' as const, logs: [] };
  const draft = { ...reportFixture, texts: { ...reportFixture.texts }, snapshot };
  const final = finalizeSpecialReport(draft);
  draft.texts.narrative = 'Nuevo texto'; draft.snapshot.metrics.spend = 900;
  assert.equal(final.texts.narrative, 'Análisis conservado'); assert.equal(final.snapshot!.metrics.spend, 100);
  const copy = duplicateSpecialReport(final);
  assert.equal(copy.status, 'draft'); assert.equal(copy.snapshot, undefined); assert.notEqual(copy.id, final.id);
  assert.equal(final.status, 'final');
});
test('special document identifies scope and exact period and omits deselected sections', () => {
  const html = renderToStaticMarkup(<MonthlyReportDocument name="Cliente" month="2025-12" mode="leads" metrics={reportPeriodMetrics({ spend: 100 }, [], 'ARS')} daily={[]} assets={[]} demographics={[]} countries={[]} regions={[]} placements={[]} placementBasis="spend" texts={{}} logs={[]} isEditing={false} onUpdate={() => {}}
    special={{ title: 'Lanzamiento', objective: 'Evaluar resultados', since: reportFixture.since, until: reportFixture.until, scope: 'Campaña del evento' }} sections={{ performance: false, assets: false, geography: false, management: false }} />);
  for (const text of ['Informe especial', 'Lanzamiento', '30/12/2025', '02/01/2026', 'Campaña del evento', 'Lectura del evento', 'Bloque 1 / 1']) assert.ok(html.includes(text), text);
  for (const text of ['Informe mensual', 'Evolución diaria', 'report-sheet-geography', 'report-sheet-management']) assert.ok(!html.includes(text), text);
});
