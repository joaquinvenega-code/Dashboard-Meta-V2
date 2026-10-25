import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClientEntities, isClientVisible, weeklyClientChoices } from './clientEntities';
import type { AccountSettings, AdAccount } from '../types';

const accounts: AdAccount[] = [1, 2, 3, 4, 5, 6].map(n => ({ id: `act_${n}`, account_id: `${n}`, name: `Cuenta ${n}`, currency: 'ARS', account_status: 1 }));
const config = (extra: Partial<AccountSettings> = {}): AccountSettings => ({ tracking: 'ecommerce', objective: 0, budget: 0, currency: 'ARS', activeClient: true, ...extra });

test('shared clients consolidate ID aliases and preserve the configured name and type', () => {
  const settings = { group_a: config({ customName: 'Cliente unificado', tracking: 'both' }), act_3: config({ customName: 'Tienda' }) };
  const entities = buildClientEntities(accounts, [{ id: 'group_a', name: 'Grupo', accountIds: ['1', 'act_2'] }], settings);
  assert.equal(entities.length, 5);
  const group = entities.find(e => e.id === 'group_a')!;
  assert.equal(group.name, 'Cliente unificado');
  assert.deepEqual(group.memberAccounts.map(a => a.id), ['act_1', 'act_2']);
  assert.equal(isClientVisible(group, ['2']), true);
  assert.equal(entities.some(e => e.id === 'act_1' || e.id === 'act_2'), false);
  assert.equal(entities.find(e => e.id === 'act_3')!.name, 'Tienda');
  assert.equal(settings.group_a.tracking, 'both');
});

test('weekly choices exclude inactive and unscheduled hidden accounts, retaining existing hidden schedules for removal', () => {
  const settings = { act_1: config(), act_2: config({ activeClient: false, weeklyReportEnabled: true }),
    act_3: config(), act_4: config({ weeklyReportEnabled: true }), act_5: config({ activeClient: undefined }) };
  const choices = weeklyClientChoices(buildClientEntities(accounts, [], settings), settings, ['1', '2', '5', '6']);
  assert.deepEqual(choices.map(e => e.id), ['act_1', 'act_4']);
  assert.equal(settings.act_4.weeklyReportEnabled, true);
});
