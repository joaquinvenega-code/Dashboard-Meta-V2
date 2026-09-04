import { endOfMonth, format, isValid, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';

export interface DashboardDateRange { since: string; until: string }

export function dashboardDatePresets(now = new Date()) {
  const date = (value: Date) => format(value, 'yyyy-MM-dd');
  const today = date(now);
  const yesterday = date(subDays(now, 1));
  const previousMonth = subMonths(now, 1);
  return [
    { id: 'today', label: 'Hoy', since: today, until: today },
    { id: 'yesterday', label: 'Ayer', since: yesterday, until: yesterday },
    { id: 'this_month', label: 'Este mes', since: date(startOfMonth(now)), until: today },
    { id: 'last_month', label: 'Mes anterior', since: date(startOfMonth(previousMonth)), until: date(endOfMonth(previousMonth)) },
    { id: 'last_7', label: 'Últimos 7 días', since: date(subDays(now, 6)), until: today },
    { id: 'last_30', label: 'Últimos 30 días', since: date(subDays(now, 29)), until: today },
  ];
}

export function dateRangeError(range: DashboardDateRange, today: string) {
  if (!range.since || !range.until) return 'Completá ambas fechas para continuar.';
  if (![range.since, range.until].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)))) return 'Ingresá fechas válidas.';
  if (range.since > range.until) return 'La fecha Desde debe ser anterior o igual a Hasta.';
  if (range.until > today) return 'Elegí un período que termine hoy o antes.';
  return '';
}
