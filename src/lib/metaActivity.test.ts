import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityBudgetDetail, collectMetaActivity } from './metaActivity';
import { fetchAccountActivity, setFacebookAccessToken, type MetaAccountActivity } from '../services/facebook';

const base: MetaAccountActivity = { event_time: '2026-08-21T05:03:56+0000', event_type: 'create_ad', object_id: 'ad-1', object_name: 'Anuncio de prueba', actor_id: 'actor-1', actor_name: 'Agencia' };
const collect = (rows: MetaAccountActivity[]) => collectMetaActivity(rows, 'act_123', '2026-08-01', '2026-08-31', 'ARS', 'America/Argentina/Buenos_Aires');

test('Meta activity deduplicates exact repeats but retains different objects and dates', () => {
  const result = collect([base, { ...base }, { ...base, object_id: 'ad-2' }, { ...base, event_time: '2026-08-22T05:03:56+0000' }]);
  assert.equal(result.logs.length, 2);
  assert.match(result.logs[0].description, /Se crearon 2 anuncios/);
  assert.notEqual(result.logs[0].id, result.logs[1].id);
  assert.deepEqual(collect([base, base]), collect([base]));
});

test('Meta activity uses the account calendar day at month boundaries', () => {
  const result = collect([{ ...base, event_time: '2026-08-01T02:59:00Z' }, { ...base, event_time: '2026-09-01T02:59:00Z' }, { ...base, event_time: '2026-09-01T03:00:00Z' }, { ...base, event_time: 'invalid' }]);
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].date, '31/08');
  assert.equal(result.unresolved, 1);
});

test('budget details convert known Meta units and retain zero without inventing missing values', () => {
  const data = { old_value: { currency: 'ARS', old_value: 550000 }, new_value: { currency: 'ARS', new_value: 350000, additional_value: 'por día' } };
  assert.equal(activityBudgetDetail(data, 'USD'), ' De ARS 5.500 a ARS 3.500 por día.');
  assert.match(activityBudgetDetail({ old_value: 100, new_value: 0, currency: 'USD' }, ''), /USD 1 a USD 0/);
  assert.equal(activityBudgetDetail({ old_value: null, new_value: 350000 }, 'ARS'), '');
  assert.equal(activityBudgetDetail({ old_value: 100, new_value: 200 }, 'UNKNOWN'), '');
  assert.equal(activityBudgetDetail({ old_value: { currency: 'USD', old_value: 100 }, new_value: { currency: 'ARS', new_value: 200 } }, ''), '');
});

test('technical transitions and billing do not masquerade as agency work; meaningful automated budget changes survive', () => {
  const row = (event_type: string, extra: object, actor_name = 'Agencia'): MetaAccountActivity => ({ ...base, event_type, actor_name, extra_data: JSON.stringify(extra) });
  const result = collect([
    row('ad_account_billing_charge', {}),
    row('update_ad_run_status', { new_value: 'Procesamiento pendiente' }),
    row('update_ad_run_status_to_be_set_after_review', { new_value: 'Activo' }),
    row('update_ad_run_status', { old_value: 'Revisión pendiente', new_value: 'Activo' }, 'Meta'),
    row('update_ad_run_status', { old_value: 'Procesamiento pendiente', new_value: 'Inactivo' }),
    row('update_ad_set_budget', { old_value: 100, new_value: 200, currency: 'ARS' }, 'Meta'),
  ]);
  assert.equal(result.logs.length, 2);
  assert.equal(result.automatic.length, 1);
  assert.ok(result.logs.some(log => log.source === 'Meta · Automático' && /ARS 1 a ARS 2/.test(log.description)));
  assert.ok(result.logs.some(log => /Se pausó el anuncio/.test(log.description)));
});

test('creative changes and malformed details remain readable without fabricating amounts', () => {
  const result = collect([{ ...base, event_type: 'update_ad_creative', extra_data: 'broken JSON' }, { ...base, event_type: 'update_ad_set_budget', extra_data: '{}' }]);
  assert.equal(result.logs.length, 2);
  assert.ok(result.logs.some(log => /Se actualizó el contenido/.test(log.description)));
  assert.ok(result.logs.every(log => !log.description.includes('NaN') && !log.description.includes('undefined')));
});

function setupApi(t: any, fetcher: typeof fetch) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } });
  setFacebookAccessToken('test-only-token');
  t.mock.method(globalThis, 'fetch', fetcher);
  t.after(() => {
    setFacebookAccessToken(null);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
}
const response = (data: object) => new Response(JSON.stringify(data), { status: 200 });

test('activity pagination keeps date filters and never follows a pagination URL containing credentials', async t => {
  const urls: URL[] = [];
  setupApi(t, async input => {
    const url = new URL(String(input)); urls.push(url);
    if (!url.pathname.endsWith('/activities')) return response({ currency: 'ARS', timezone_name: 'America/Argentina/Buenos_Aires' });
    if (!url.searchParams.has('after')) return response({ data: [base], paging: { next: 'https://untrusted.example/?access_token=do-not-follow', cursors: { after: 'page-2' } } });
    return response({ data: [{ ...base, object_id: 'ad-2' }] });
  });
  const result = await fetchAccountActivity('123', '2026-08-01', '2026-08-31');
  assert.equal(result.complete, true);
  assert.equal(result.data.length, 2);
  assert.equal(urls.length, 3);
  assert.ok(urls.every(url => url.hostname === 'graph.facebook.com'));
  assert.equal(urls[1].searchParams.get('since'), urls[2].searchParams.get('since'));
  assert.equal(urls[1].searchParams.get('until'), urls[2].searchParams.get('until'));
  assert.equal(urls[2].searchParams.get('after'), 'page-2');
});

test('a later-page failure returns explicit partial results rather than an empty successful history', async t => {
  setupApi(t, async input => {
    const url = new URL(String(input));
    if (!url.pathname.endsWith('/activities')) return response({ currency: 'ARS', timezone_name: 'UTC' });
    if (url.searchParams.has('after')) throw new Error('network unavailable');
    return response({ data: [base], paging: { next: 'next', cursors: { after: 'page-2' } } });
  });
  const result = await fetchAccountActivity('123', '2026-08-01', '2026-08-31');
  assert.equal(result.complete, false); assert.equal(result.data.length, 1);
});

test('an activity permission failure is not reported as no changes', async t => {
  setupApi(t, async input => String(input).includes('/activities') ? new Response(JSON.stringify({ error: { code: 200, message: 'Permission denied' } }), { status: 403 }) : response({ currency: 'ARS', timezone_name: 'UTC' }));
  await assert.rejects(fetchAccountActivity('123', '2026-08-01', '2026-08-31'), /Permission denied/);
});
