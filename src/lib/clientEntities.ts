import type { AccountGroup, AccountSettings, AdAccount } from '../types';

export const cleanClientAccountId = (id: string | undefined) => (id || '').replace(/^act_/i, '').toLowerCase();
export const clientAccountIdsMatch = (a: string | undefined, b: string | undefined) => Boolean(cleanClientAccountId(a) && cleanClientAccountId(a) === cleanClientAccountId(b));

export type ClientEntity = {
  id: string; name: string; account: AdAccount; memberAccounts: AdAccount[]; isConsolidated: boolean;
};

// Configuration and reports use the same clients; consolidated accounts never appear twice.
export function buildClientEntities(accounts: AdAccount[], groups: AccountGroup[], settings: Record<string, AccountSettings>): ClientEntity[] {
  const grouped = new Set(groups.flatMap(g => g.accountIds.map(cleanClientAccountId)));
  const consolidated = groups.map(group => {
    const members = accounts.filter(a => group.accountIds.some(id => clientAccountIdsMatch(id, a.id) || clientAccountIdsMatch(id, a.account_id)));
    const account: AdAccount = { id: group.id, account_id: 'GRUPO', name: settings[group.id]?.customName || group.name,
      account_status: members.some(a => a.account_status === 1) ? 1 : 0,
      currency: settings[group.id]?.currency || members[0]?.currency || 'ARS' };
    return { id: group.id, name: account.name, account, memberAccounts: members, isConsolidated: true };
  }).filter(e => e.memberAccounts.length > 0);
  const standalone = accounts.filter(a => !grouped.has(cleanClientAccountId(a.id)) && !grouped.has(cleanClientAccountId(a.account_id)))
    .map(a => ({ id: a.id, name: settings[a.id]?.customName || a.name,
      account: { ...a, name: settings[a.id]?.customName || a.name }, memberAccounts: [a], isConsolidated: false }));
  return [...consolidated, ...standalone].sort((a, b) => a.name.localeCompare(b.name));
}

export function isClientVisible(entity: ClientEntity, visibleAccountIds: string[]) {
  return entity.memberAccounts.some(a => visibleAccountIds.some(id => clientAccountIdsMatch(id, a.id) || clientAccountIdsMatch(id, a.account_id)));
}

export function weeklyClientChoices(entities: ClientEntity[], settings: Record<string, AccountSettings>, visibleAccountIds: string[]) {
  // Keep already scheduled hidden clients reachable so the user can turn them off.
  return entities.filter(e => settings[e.id]?.activeClient === true
    && (isClientVisible(e, visibleAccountIds) || settings[e.id]?.weeklyReportEnabled === true));
}
