import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  Layers3,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AdAccount, AccountGroup, AccountSettings, ClientCategory } from '../types';
import { cn } from '../lib/utils';

type ManagementTab = 'visibility' | 'consolidation' | 'portfolios';

type DashboardEntity = {
  id: string;
  name: string;
  account: AdAccount;
  memberAccounts: AdAccount[];
  isConsolidated: boolean;
};

interface AccountsManagementProps {
  accounts: AdAccount[];
  visibleAccountIds: string[];
  accountGroups: AccountGroup[];
  clientCategories: ClientCategory[];
  settings: Record<string, AccountSettings>;
  onSetAccountsVisibility: (accountIds: string[], visible: boolean) => void;
  onGroupsChange: (groups: AccountGroup[]) => void;
  onCategoriesChange: (categories: ClientCategory[]) => void;
  onAssignCategory: (entityId: string, categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onConfigure: (entity: AdAccount) => void;
}

const CATEGORY_COLORS = ['#60a5fa', '#a78bfa', '#2dd4bf', '#f59e0b', '#fb7185', '#22c55e'];

const cleanId = (value: string | undefined) => (value || '').replace(/^act_/i, '').toLowerCase();

const idsMatch = (first: string | undefined, second: string | undefined) => {
  const left = cleanId(first);
  const right = cleanId(second);
  return Boolean(left && right && left === right);
};

export function AccountsManagement({
  accounts,
  visibleAccountIds,
  accountGroups,
  clientCategories,
  settings,
  onSetAccountsVisibility,
  onGroupsChange,
  onCategoriesChange,
  onAssignCategory,
  onDeleteCategory,
  onConfigure,
}: AccountsManagementProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>('visibility');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{
    kind: 'group' | 'category';
    mode: 'create' | 'edit';
    id?: string;
    value: string;
  } | null>(null);

  const groupedAccountIds = useMemo(() => {
    return new Set(accountGroups.flatMap(group => group.accountIds.map(cleanId)));
  }, [accountGroups]);

  const dashboardEntities = useMemo<DashboardEntity[]>(() => {
    const groups = accountGroups.map(group => {
      const members = accounts.filter(account =>
        group.accountIds.some(id => idsMatch(id, account.id) || idsMatch(id, account.account_id)),
      );
      const groupSettings = settings[group.id];
      const account: AdAccount = {
        id: group.id,
        account_id: 'GRUPO',
        name: groupSettings?.customName || group.name,
        account_status: members.some(member => member.account_status === 1) ? 1 : 0,
        currency: groupSettings?.currency || members[0]?.currency || 'ARS',
      };

      return {
        id: group.id,
        name: account.name,
        account,
        memberAccounts: members,
        isConsolidated: true,
      };
    }).filter(entity => entity.memberAccounts.length > 0);

    const standalone = accounts
      .filter(account => !groupedAccountIds.has(cleanId(account.id)) && !groupedAccountIds.has(cleanId(account.account_id)))
      .map(account => ({
        id: account.id,
        name: settings[account.id]?.customName || account.name,
        account: { ...account, name: settings[account.id]?.customName || account.name },
        memberAccounts: [account],
        isConsolidated: false,
      }));

    return [...groups, ...standalone].sort((a, b) => a.name.localeCompare(b.name));
  }, [accountGroups, accounts, groupedAccountIds, settings]);

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dashboardEntities;
    return dashboardEntities.filter(entity =>
      entity.name.toLowerCase().includes(query)
      || entity.memberAccounts.some(account =>
        account.name.toLowerCase().includes(query)
        || account.id.toLowerCase().includes(query)
        || account.account_id.toLowerCase().includes(query),
      ),
    );
  }, [dashboardEntities, search]);

  const isEntityVisible = (entity: DashboardEntity) => entity.memberAccounts.some(account =>
    visibleAccountIds.some(id => idsMatch(id, account.id) || idsMatch(id, account.account_id)),
  );

  const visibleEntities = dashboardEntities.filter(isEntityVisible);
  const assignedEntities = dashboardEntities.filter(entity => Boolean(settings[entity.id]?.categoryId));
  const availableAccounts = accounts.filter(account =>
    !accountGroups.some(group => group.accountIds.some(id => idsMatch(id, account.id) || idsMatch(id, account.account_id))),
  );

  const saveDialog = () => {
    if (!dialog?.value.trim()) return;
    const value = dialog.value.trim();

    if (dialog.kind === 'group') {
      if (dialog.mode === 'create') {
        onGroupsChange([...accountGroups, { id: `group_${crypto.randomUUID()}`, name: value, accountIds: [] }]);
      } else {
        onGroupsChange(accountGroups.map(group => group.id === dialog.id ? { ...group, name: value } : group));
      }
    } else if (dialog.mode === 'create') {
      onCategoriesChange([
        ...clientCategories,
        {
          id: `category_${crypto.randomUUID()}`,
          name: value,
          color: CATEGORY_COLORS[clientCategories.length % CATEGORY_COLORS.length],
        },
      ]);
    } else {
      onCategoriesChange(clientCategories.map(category =>
        category.id === dialog.id ? { ...category, name: value } : category,
      ));
    }

    setDialog(null);
  };

  const addAccountToGroup = (groupId: string, accountId: string) => {
    if (!accountId) return;
    onGroupsChange(accountGroups.map(group => ({
      ...group,
      accountIds: group.id === groupId
        ? [...group.accountIds.filter(id => !idsMatch(id, accountId)), accountId]
        : group.accountIds.filter(id => !idsMatch(id, accountId)),
    })));
  };

  const addEntityToCategory = (categoryId: string, entityId: string) => {
    if (!entityId) return;
    onAssignCategory(entityId, categoryId);
  };

  const tabs: Array<{ id: ManagementTab; label: string; detail: string; icon: React.ElementType }> = [
    { id: 'visibility', label: 'Visibilidad', detail: 'Qué aparece en tableros', icon: Eye },
    { id: 'consolidation', label: 'Clientes consolidados', detail: 'Varias cuentas, una métrica', icon: Layers3 },
    { id: 'portfolios', label: 'Grupos de clientes', detail: 'Organizar la cartera', icon: FolderKanban },
  ];

  return (
    <div className="animate-in fade-in space-y-5 pb-20 duration-500">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11161e] shadow-2xl shadow-black/20">
        <div className="border-b border-white/[0.07] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_32%)] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                <Building2 className="h-3.5 w-3.5" />
                Administración de cartera
              </div>
              <h3 className="text-xl font-semibold tracking-[-0.025em] text-white">Definí cómo se representan tus clientes</h3>
              <p className="mt-1.5 text-xs leading-5 text-neutral-400">
                Primero consolidá las cuentas publicitarias que pertenecen al mismo cliente. Después elegí cuáles se ven y organizalos en grupos para filtrar Vista general y Detalle de cuentas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[500px]">
              <Summary label="Cuentas Meta" value={accounts.length} />
              <Summary label="Clientes visibles" value={visibleEntities.length} accent />
              <Summary label="Consolidados" value={accountGroups.length} />
              <Summary label="En grupos" value={assignedEntities.length} />
            </div>
          </div>
        </div>

        <div className="grid gap-1 p-2 sm:grid-cols-3">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors',
                  selected ? 'bg-blue-500/10 text-white ring-1 ring-inset ring-blue-400/20' : 'text-neutral-500 hover:bg-white/[0.035] hover:text-neutral-300',
                )}
              >
                <span className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold',
                  selected ? 'border-blue-400/20 bg-blue-500/15 text-blue-300' : 'border-white/[0.07] bg-black/15 text-neutral-600',
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold"><span className="mr-1.5 text-neutral-600">0{index + 1}</span>{tab.label}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-neutral-600">{tab.detail}</span>
                </span>
                {selected && <Check className="ml-auto h-3.5 w-3.5 text-blue-300" />}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'visibility' && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11161e]">
          <SectionHeader
            title="Clientes visibles"
            description="Cada fila representa una entidad del tablero; un cliente consolidado incluye todas sus cuentas Meta."
            actions={(
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSetAccountsVisibility(accounts.map(account => account.id), true)} className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-[10px] font-medium text-blue-300 transition-colors hover:bg-blue-500/15">Mostrar todos</button>
                <button type="button" onClick={() => onSetAccountsVisibility(accounts.map(account => account.id), false)} className="rounded-lg border border-white/[0.07] px-3 py-2 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-300">Ocultar todos</button>
              </div>
            )}
          />

          <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar cliente, cuenta o ID de Meta…"
                className="h-9 w-full rounded-lg border border-white/[0.07] bg-black/20 pl-9 pr-3 text-[11px] text-white outline-none transition-colors placeholder:text-neutral-700 focus:border-blue-400/30"
              />
            </div>
          </div>

          <div className="divide-y divide-white/[0.055]">
            {filteredEntities.map(entity => {
              const visible = isEntityVisible(entity);
              const category = clientCategories.find(item => item.id === settings[entity.id]?.categoryId);
              return (
                <article key={entity.id} className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.018] sm:px-6 lg:grid-cols-[minmax(0,1fr)_210px_120px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => onSetAccountsVisibility(entity.memberAccounts.map(account => account.id), !visible)}
                    className="flex min-w-0 items-center gap-3 text-left"
                    aria-pressed={visible}
                  >
                    <span className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                      visible ? 'border-blue-400/20 bg-blue-500/12 text-blue-300' : 'border-white/[0.07] bg-black/15 text-neutral-600',
                    )}>
                      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-neutral-100">{entity.name}</span>
                        {entity.isConsolidated && <span className="shrink-0 rounded-full border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 text-[8px] font-medium text-violet-300">Consolidado</span>}
                      </span>
                      <span className="mt-1 block truncate text-[9px] text-neutral-600">
                        {entity.isConsolidated
                          ? `${entity.memberAccounts.length} cuentas Meta · ${entity.memberAccounts.map(account => account.name).join(' + ')}`
                          : `Cuenta Meta ${entity.memberAccounts[0]?.account_id || entity.id}`}
                      </span>
                    </span>
                  </button>

                  <label className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category?.color || '#3f3f46' }} />
                    <select
                      aria-label={`Grupo de clientes para ${entity.name}`}
                      value={settings[entity.id]?.categoryId || ''}
                      onChange={event => onAssignCategory(entity.id, event.target.value)}
                      className="h-8 min-w-0 flex-1 cursor-pointer rounded-lg border border-white/[0.07] bg-[#0d1117] px-2.5 text-[10px] text-neutral-400 outline-none focus:border-blue-400/30"
                    >
                      <option value="">Sin grupo de clientes</option>
                      {clientCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-2 lg:justify-end">
                    <span className={cn('text-[9px] font-medium', visible ? 'text-emerald-400' : 'text-neutral-600')}>{visible ? 'Visible' : 'Oculto'}</span>
                    <button type="button" onClick={() => onConfigure(entity.account)} className="rounded-lg border border-white/[0.07] p-2 text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-white" title="Configurar cliente">
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
            {filteredEntities.length === 0 && <EmptyState title="No encontramos coincidencias" detail="Probá con otro nombre o ID de cuenta." />}
          </div>
        </section>
      )}

      {activeTab === 'consolidation' && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11161e]">
          <SectionHeader
            title="Clientes consolidados"
            description="Uní las cuentas publicitarias de un mismo cliente. En los tableros sus métricas se suman y aparecen como una sola cuenta."
            actions={(
              <button type="button" onClick={() => setDialog({ kind: 'group', mode: 'create', value: '' })} className="flex items-center gap-2 rounded-lg bg-blue-500 px-3.5 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-blue-400">
                <Plus className="h-3.5 w-3.5" /> Crear cliente consolidado
              </button>
            )}
          />

          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-2">
            {accountGroups.map(group => {
              const members = accounts.filter(account => group.accountIds.some(id => idsMatch(id, account.id) || idsMatch(id, account.account_id)));
              const visible = members.some(account => visibleAccountIds.some(id => idsMatch(id, account.id) || idsMatch(id, account.account_id)));
              return (
                <article key={group.id} className="rounded-xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300"><Layers3 className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-xs font-semibold text-white">{group.name}</h4>
                        <span className={cn('h-1.5 w-1.5 rounded-full', visible ? 'bg-emerald-400' : 'bg-neutral-700')} />
                      </div>
                      <p className="mt-1 text-[9px] text-neutral-600">{members.length} {members.length === 1 ? 'cuenta vinculada' : 'cuentas vinculadas'} · una entidad en tableros</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ kind: 'group', mode: 'edit', id: group.id, value: group.name })} className="rounded-lg p-2 text-neutral-600 hover:bg-white/[0.04] hover:text-white" title="Renombrar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => onGroupsChange(accountGroups.filter(item => item.id !== group.id))} className="rounded-lg p-2 text-neutral-600 hover:bg-red-500/10 hover:text-red-300" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {members.map(account => (
                      <div key={account.id} className="flex items-center gap-3 rounded-lg border border-white/[0.055] bg-[#11161e] px-3 py-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-300"><Building2 className="h-3 w-3" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-medium text-neutral-300">{account.name}</p>
                          <p className="mt-0.5 text-[8px] text-neutral-600">{account.account_id}</p>
                        </div>
                        <button type="button" onClick={() => onGroupsChange(accountGroups.map(item => item.id === group.id ? { ...item, accountIds: item.accountIds.filter(id => !idsMatch(id, account.id)) } : item))} className="rounded-md p-1.5 text-neutral-700 hover:bg-red-500/10 hover:text-red-300" title="Quitar cuenta"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {members.length === 0 && <div className="rounded-lg border border-dashed border-white/[0.08] px-3 py-5 text-center text-[10px] text-neutral-600">Agregá al menos una cuenta Meta para activar este cliente.</div>}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value=""
                      onChange={event => addAccountToGroup(group.id, event.target.value)}
                      className="h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-white/[0.07] bg-[#0d1117] px-3 text-[10px] text-neutral-400 outline-none focus:border-blue-400/30"
                      aria-label={`Agregar cuenta a ${group.name}`}
                    >
                      <option value="">+ Agregar una cuenta Meta</option>
                      {availableAccounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.account_id}</option>)}
                    </select>
                    {members.length > 0 && (
                      <button type="button" onClick={() => onSetAccountsVisibility(members.map(account => account.id), !visible)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-[9px] font-medium', visible ? 'border-emerald-400/15 bg-emerald-500/8 text-emerald-300' : 'border-white/[0.07] text-neutral-500')}>
                        {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{visible ? 'Visible' : 'Oculto'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {accountGroups.length === 0 && <div className="xl:col-span-2"><EmptyState title="Todavía no hay clientes consolidados" detail="Creá uno cuando un cliente tenga dos o más cuentas publicitarias." icon={Layers3} /></div>}
          </div>
        </section>
      )}

      {activeTab === 'portfolios' && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11161e]">
          <SectionHeader
            title="Grupos de clientes"
            description="Armá carteras, equipos o segmentos. Estos grupos aparecen como filtros en Vista general y Detalle de cuentas."
            actions={(
              <button type="button" onClick={() => setDialog({ kind: 'category', mode: 'create', value: '' })} className="flex items-center gap-2 rounded-lg bg-blue-500 px-3.5 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-blue-400">
                <Plus className="h-3.5 w-3.5" /> Crear grupo de clientes
              </button>
            )}
          />

          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-2">
            {clientCategories.map((category, index) => {
              const entities = dashboardEntities.filter(entity => settings[entity.id]?.categoryId === category.id);
              const unassigned = dashboardEntities.filter(entity => !settings[entity.id]?.categoryId);
              const color = category.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              return (
                <article key={category.id} className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/15">
                  <div className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border" style={{ color, backgroundColor: `${color}14`, borderColor: `${color}2e` }}><Users className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-semibold text-white">{category.name}</h4>
                      <p className="mt-1 text-[9px] text-neutral-600">{entities.length} {entities.length === 1 ? 'cliente' : 'clientes'} en este grupo</p>
                    </div>
                    <button type="button" onClick={() => setDialog({ kind: 'category', mode: 'edit', id: category.id, value: category.name })} className="rounded-lg p-2 text-neutral-600 hover:bg-white/[0.04] hover:text-white" title="Renombrar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => onDeleteCategory(category.id)} className="rounded-lg p-2 text-neutral-600 hover:bg-red-500/10 hover:text-red-300" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  <div className="space-y-2 p-4">
                    {entities.map(entity => (
                      <div key={entity.id} className="flex items-center gap-3 rounded-lg border border-white/[0.055] bg-[#11161e] px-3 py-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-medium text-neutral-300">{entity.name}</p>
                          <p className="mt-0.5 text-[8px] text-neutral-600">{entity.isConsolidated ? `${entity.memberAccounts.length} cuentas consolidadas` : '1 cuenta Meta'}</p>
                        </div>
                        <button type="button" onClick={() => onAssignCategory(entity.id, '')} className="rounded-md p-1.5 text-neutral-700 hover:bg-red-500/10 hover:text-red-300" title="Quitar del grupo"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {entities.length === 0 && <div className="rounded-lg border border-dashed border-white/[0.08] px-3 py-5 text-center text-[10px] text-neutral-600">Este grupo todavía no tiene clientes.</div>}
                    <select
                      value=""
                      onChange={event => addEntityToCategory(category.id, event.target.value)}
                      className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/[0.07] bg-[#0d1117] px-3 text-[10px] text-neutral-400 outline-none focus:border-blue-400/30"
                      aria-label={`Agregar cliente a ${category.name}`}
                    >
                      <option value="">+ Agregar cliente al grupo</option>
                      {unassigned.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                    </select>
                  </div>
                </article>
              );
            })}
            {clientCategories.length === 0 && <div className="xl:col-span-2"><EmptyState title="Todavía no hay grupos de clientes" detail="Creá un grupo para organizar la cartera y usarlo como filtro en los tableros." icon={FolderKanban} /></div>}
          </div>
        </section>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="management-dialog-title">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDialog(null)} />
          <form
            onSubmit={event => { event.preventDefault(); saveDialog(); }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#11161e] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                {dialog.kind === 'group' ? <Layers3 className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="management-dialog-title" className="text-sm font-semibold text-white">
                  {dialog.mode === 'create' ? 'Crear' : 'Renombrar'} {dialog.kind === 'group' ? 'cliente consolidado' : 'grupo de clientes'}
                </h3>
                <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                  {dialog.kind === 'group' ? 'Este nombre será el que se vea en los tableros.' : 'Este nombre aparecerá en los filtros de la cartera.'}
                </p>
              </div>
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg p-1.5 text-neutral-600 hover:bg-white/[0.04] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-5 block text-[10px] font-medium text-neutral-400">Nombre</label>
            <input
              autoFocus
              value={dialog.value}
              onChange={event => setDialog({ ...dialog, value: event.target.value })}
              placeholder={dialog.kind === 'group' ? 'Ej. Acme Argentina' : 'Ej. Equipo Ecommerce'}
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3.5 text-xs text-white outline-none placeholder:text-neutral-700 focus:border-blue-400/35"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg px-3.5 py-2.5 text-[10px] font-medium text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300">Cancelar</button>
              <button type="submit" disabled={!dialog.value.trim()} className="rounded-lg bg-blue-500 px-4 py-2.5 text-[10px] font-semibold text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-30">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5', accent ? 'border-blue-400/20 bg-blue-500/10' : 'border-white/[0.07] bg-black/15')}>
      <p className={cn('text-lg font-semibold tabular-nums', accent ? 'text-blue-200' : 'text-neutral-200')}>{value}</p>
      <p className="mt-0.5 truncate text-[8px] font-medium uppercase tracking-[0.12em] text-neutral-600">{label}</p>
    </div>
  );
}

function SectionHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
        <p className="mt-1 max-w-3xl text-[10px] leading-4 text-neutral-500">{description}</p>
      </div>
      {actions}
    </div>
  );
}

function EmptyState({ title, detail, icon: Icon = CheckCircle2 }: { title: string; detail: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-black/15 text-neutral-700"><Icon className="h-5 w-5" /></span>
      <h4 className="mt-3 text-xs font-medium text-neutral-300">{title}</h4>
      <p className="mt-1 text-[10px] text-neutral-600">{detail}</p>
    </div>
  );
}
