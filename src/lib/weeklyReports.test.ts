import test from 'node:test';
import assert from 'node:assert/strict';
import { previousWeek, weeklyTargets, consolidateAccounts, consolidateDaily, detailOptions, trackingMetrics, validatePortfolio, portfolioFingerprint, offlineRevenueForPeriod, type Portfolio } from './weeklyReports';
import type { AccountSettings, AdAccount } from '../types';

const settings = (patch: Partial<AccountSettings> = {}): AccountSettings => ({ objective: 0, budget: 0, currency: 'ARS', tracking: 'ecommerce', ...patch });
const portfolio = (): Portfolio => ({ version: 1, settings: {}, groups: [], categories: [], visibleAccountIds: [], notes: [] });

test('previous full week uses Argentina date, including UTC Monday before local midnight and year boundaries', () => {
  assert.deepEqual(previousWeek(new Date('2026-10-19T12:17:00Z')), { since: '2026-10-12', until: '2026-10-18' });
  assert.deepEqual(previousWeek(new Date('2026-10-19T01:00:00Z')), { since: '2026-10-05', until: '2026-10-11' });
  assert.deepEqual(previousWeek(new Date('2026-01-05T12:17:00Z')), { since: '2025-12-29', until: '2026-01-04' });
  assert.deepEqual(previousWeek(new Date('2024-03-04T12:17:00Z')), { since: '2024-02-26', until: '2024-03-03' });
});

test('Monday delivery and later retries keep the same complete Monday-Sunday period', () => {
  for (const instant of ['2026-10-26T04:17:00Z', '2026-10-26T09:17:00Z', '2026-10-26T11:00:00Z', '2026-10-27T12:00:00Z', '2026-11-02T02:59:59Z']) {
    assert.deepEqual(previousWeek(new Date(instant)), { since: '2026-10-19', until: '2026-10-25' });
  }
  for (const instant of ['2026-11-02T03:00:00Z', '2026-11-02T04:17:00Z', '2026-11-02T11:00:00Z']) {
    assert.deepEqual(previousWeek(new Date(instant)), { since: '2026-10-26', until: '2026-11-01' });
  }
});

test('visibility and Meta access alone never enroll a client; groups print once even when members were enabled before consolidation', () => {
  const p = portfolio(); p.visibleAccountIds = ['act_1', 'act_2'];
  p.settings = { act_1: settings(), act_2: settings({ activeClient: true }), act_3: settings({ weeklyReportEnabled: true }), act_4: settings({ activeClient: true, weeklyReportEnabled: true }) };
  assert.deepEqual(weeklyTargets(p).map(t => t.id), ['act_4']);
  p.groups = [{ id: 'group', name: 'Cliente', accountIds: ['act_4', '5'] }];
  assert.deepEqual(weeklyTargets(p), []);
  p.settings.group = settings({ activeClient: true, weeklyReportEnabled: true, tracking: 'both' });
  assert.deepEqual(weeklyTargets(p).map(t => t.accountIds), [['act_4', 'act_5']]);
  assert.equal(weeklyTargets(p)[0].settings.tracking, 'both');
});

test('ambiguous groups and missing account assignments fail instead of duplicating PDFs', () => {
  const p = portfolio();
  p.settings = { a: settings({ activeClient: true, weeklyReportEnabled: true }), b: settings({ activeClient: true, weeklyReportEnabled: true }) };
  p.groups = [{ id: 'a', name: 'A', accountIds: ['act_1'] }, { id: 'b', name: 'B', accountIds: ['1'] }];
  assert.throws(() => weeklyTargets(p), /más de un cliente/);
  p.groups[1].accountIds = []; assert.throws(() => weeklyTargets(p), /cuentas/);
});

test('client types keep appropriate defaults and retain explicit print choices', () => {
  assert.equal(detailOptions(settings({ tracking: 'messaging' })).sortBy, 'messages');
  assert.equal(detailOptions(settings({ tracking: 'ecommerce' })).sortBy, 'roas');
  assert.ok(trackingMetrics('both').includes('purchases')); assert.ok(trackingMetrics('both').includes('messages'));
  assert.ok(!trackingMetrics('both').includes('leads'));
  const custom = { topN: 3, sortBy: 'spend' as const, showMetrics: false, showObservations: true };
  assert.deepEqual(detailOptions(settings({ tracking: 'both', detailReport: custom })), custom);
});

test('consolidation recomputes weighted costs, preserves inactive clients, and rejects mixed currencies', () => {
  const accounts: AdAccount[] = [
    { id: 'act_1', account_id: '1', name: 'A', currency: 'ARS', account_status: 2, spend: 100, purchases: 2, revenue: 300, messagesReal: 10, costPerMessageReal: 5 },
    { id: 'act_2', account_id: '2', name: 'B', currency: 'ARS', account_status: 2, spend: 300, purchases: 2, revenue: 200, messagesReal: 5, costPerMessageReal: 10 },
  ];
  const total = consolidateAccounts('group', 'Cliente', accounts);
  assert.equal(total.revenue, 500); assert.equal(total.costPerPurchase, 100); assert.equal(total.costPerMessageReal, 100 / 15);
  assert.equal(total.account_status, 0);
  assert.throws(() => consolidateAccounts('group', 'Cliente', [accounts[0], { ...accounts[1], currency: 'USD' }]), /monedas/);
  const days = consolidateDaily([{ date: '2026-10-12', spend: 100, purchases: 1, revenue: 300, roas: 3 }, { date: '2026-10-12', spend: 300, purchases: 1, revenue: 100, roas: 1 / 3 }]);
  assert.equal(days[0].roas, 1); assert.equal(days[0].purchases, 2);
});

test('weekly offline revenue uses dated entries across months, never a whole monthly amount', () => {
  const s = settings({ manualRevenueByMonth: { '2026-09': 999999 } });
  assert.equal(offlineRevenueForPeriod(s, '2026-09-28', '2026-10-04'), 0);
  assert.equal(offlineRevenueForPeriod(s, '2026-09-01', '2026-09-30'), 999999);
  s.offlineSalesLogByMonth = { '2026-09': [{ id: '1', amount: 100, date: '2026-09-29', note: '' }], '2026-10': [{ id: '2', amount: 200, date: '2026-10-02', note: '' }, { id: '3', amount: 999, date: '2026-10-05', note: '' }] };
  assert.equal(offlineRevenueForPeriod(s, '2026-09-28', '2026-10-04'), 300);
});

test('cloud map key ordering does not trigger conflicts or overwrite a local portfolio', () => {
  assert.equal(portfolioFingerprint({ b: 2, a: { y: 3, x: 1 } }), portfolioFingerprint({ a: { x: 1, y: 3 }, b: 2 }));
  assert.notEqual(portfolioFingerprint({ a: [1, 2] }), portfolioFingerprint({ a: [2, 1] }));
  assert.equal(validatePortfolio(portfolio()).version, 1);
  assert.throws(() => validatePortfolio({ ...portfolio(), settings: [] }), /formato/);
  assert.throws(() => validatePortfolio({ ...portfolio(), groups: [{ id: 'bad', accountIds: '1' }] }), /formato/);
});
