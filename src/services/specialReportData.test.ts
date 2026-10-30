import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { setFacebookAccessToken } from './facebook';
import { loadSpecialReport } from './specialReportData';
import type { SpecialReport } from '../lib/specialReports';

const report: SpecialReport = { version: 1, id: 'test', status: 'draft', createdAt: '', updatedAt: '', accountId: 'act_1', clientName: 'Prueba', title: 'Evento', objective: '', since: '2026-01-30', until: '2026-02-02', mode: 'ecommerce', theme: 'light', scope: 'campaigns', campaigns: [{ id: '123', name: 'Evento' }], sections: { performance: true, assets: true, geography: true, management: false }, texts: {} };
function mock(t: TestContext, handler: (url: URL) => object | Response) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } });
  setFacebookAccessToken('fixture');
  t.mock.method(globalThis, 'fetch', async input => { const result = handler(new URL(String(input))); return result instanceof Response ? result : new Response(JSON.stringify(result)); });
  t.after(() => { setFacebookAccessToken(null); if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window'); });
}
test('every metrics request and paginated breakdown shares the chosen campaigns and period', async t => {
  const requests: URL[] = [];
  mock(t, url => {
    requests.push(url);
    const params = url.searchParams;
    if (params.get('level') === 'ad') return { data: [] };
    if (params.has('breakdowns')) return params.has('after') ? { data: [{ spend: '10', country: 'AR', region: 'Córdoba', age: '35-44', gender: 'female', publisher_platform: 'instagram' }] } : { data: [{ spend: '10', country: 'AR', age: '25-34', gender: 'male', publisher_platform: 'facebook' }], paging: { next: 'https://invalid.example/', cursors: { after: 'next' } } };
    return { data: [{ spend: '20', reach: '15', date_start: report.since, actions: [{ action_type: 'purchase', value: '2' }] }] };
  });
  const snapshot = await loadSpecialReport(report, { currency: 'ARS' }, []);
  assert.equal(snapshot.metrics.spend, 20); assert.equal(snapshot.metrics.reach, 15);
  assert.equal(snapshot.daily.length, 4); assert.equal(snapshot.demographics.length, 2);
  assert.equal(requests.length, 9);
  for (const url of requests) {
    assert.equal(url.hostname, 'graph.facebook.com');
    assert.deepEqual(JSON.parse(url.searchParams.get('filtering')!), [{ field: 'campaign.id', operator: 'IN', value: ['123'] }]);
    assert.deepEqual(JSON.parse(url.searchParams.get('time_range')!), { since: report.since, until: report.until });
  }
});
test('missing totals or failed selected breakdowns cannot produce a partial deliverable', async t => {
  mock(t, url => url.searchParams.has('breakdowns') ? new Response(JSON.stringify({ error: { message: 'Breakdown unavailable' } }), { status: 503 }) : { data: url.searchParams.get('level') === 'ad' ? [] : [{ spend: 10 }] });
  await assert.rejects(loadSpecialReport(report, { currency: 'ARS' }, []), /Breakdown unavailable/);
});
test('all-account totals errors fail visibly; empty results do not become an all-zero PDF', async t => {
  mock(t, () => ({ data: [] }));
  await assert.rejects(loadSpecialReport({ ...report, scope: 'account' }, { currency: 'ARS' }, []), /No hay métricas/);
});
