import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { loadWeeklySnapshot } from './weeklyReportData';
import { fetchAccountDailyPerformance, setFacebookAccessToken } from './facebook';
import type { Portfolio } from '../lib/weeklyReports';

const p: Portfolio = { version: 1, groups: [{ id: 'group', name: 'Cliente mixto', accountIds: ['act_1', 'act_2'] }],
  categories: [], visibleAccountIds: [], notes: [], settings: { group: { objective: 0, budget: 0, currency: 'ARS', tracking: 'both', activeClient: true, weeklyReportEnabled: true } } };
const period = { since: '2026-10-12', until: '2026-10-18' };
const response = (data: object, status = 200) => new Response(JSON.stringify(data), { status });
function mockMeta(t: TestContext, change?: (url: URL) => Response | undefined) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } });
  setFacebookAccessToken('fixture-token');
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(String(input));
    const override = change?.(url); if (override) return override;
    if (/\/act_\d+$/.test(url.pathname)) return response({ id: url.pathname.split('/').pop(), account_id: url.pathname.endsWith('1') ? '1' : '2', name: 'Prueba', account_status: 1, currency: 'ARS', timezone_name: 'America/Argentina/Buenos_Aires' });
    if (url.pathname.endsWith('/insights') && url.searchParams.get('level') === 'account') return response({ data: [{ spend: '100', clicks: '10', impressions: '1000', date_start: '2026-10-12', actions: [{ action_type: 'purchase', value: '2' }, { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '3' }], action_values: [{ action_type: 'purchase', value: '200' }] }] });
    return response({ data: [] });
  });
  t.after(() => { setFacebookAccessToken(null); if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window'); });
}

test('weekly loader consolidates all selected accounts without depending on dashboard visibility', async t => {
  mockMeta(t);
  const data = await loadWeeklySnapshot(p, 'group', period);
  assert.equal(data.account.spend, 200); assert.equal(data.account.purchases, 4);
  assert.equal(data.daily[0].spend, 200); assert.equal(data.portfolio.settings.group.tracking, 'both');
});

test('one inaccessible group member prevents a partially populated client PDF', async t => {
  mockMeta(t, url => url.pathname.endsWith('/act_2') ? response({ error: { message: 'Permission denied' } }, 403) : undefined);
  await assert.rejects(loadWeeklySnapshot(p, 'group', period), /Permission denied/);
});

test('failure of messaging campaign metrics is not silently replaced with zero in weekly mode', async t => {
  mockMeta(t, url => url.pathname.endsWith('/campaigns') ? response({ error: { message: 'Campaigns unavailable' } }, 503) : undefined);
  await assert.rejects(loadWeeklySnapshot(p, 'group', period), /Campaigns unavailable/);
});

test('manual monthly revenue without dated records stops weekly emission', async t => {
  mockMeta(t);
  await assert.rejects(loadWeeklySnapshot({ ...p, settings: { group: { ...p.settings.group, manualRevenueByMonth: { '2026-10': 1000 } } } }, 'group', period), /ventas manuales/);
});

test('daily metrics consume every page using the same period and never follow an arbitrary next URL', async t => {
  const requested: URL[] = [];
  mockMeta(t, url => {
    requested.push(url);
    if (url.searchParams.has('after')) return response({ data: [{ date_start: '2026-10-13', spend: '200' }] });
    return response({ data: [{ date_start: '2026-10-12', spend: '100' }], paging: { next: 'https://untrusted.invalid/?token=secret', cursors: { after: 'second-page' } } });
  });
  const data = await fetchAccountDailyPerformance('act_1', period.since, period.until);
  assert.equal(data.length, 2); assert.equal(data[1].spend, 200);
  assert.ok(requested.every(url => url.hostname === 'graph.facebook.com'));
  assert.equal(requested[0].searchParams.get('time_range'), requested[1].searchParams.get('time_range'));
});
