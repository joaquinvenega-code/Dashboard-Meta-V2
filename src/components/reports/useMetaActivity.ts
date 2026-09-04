import { useEffect, useState, useCallback } from 'react';
import { fetchAccountActivity } from '../../services/facebook';
import { collectMetaActivity } from '../../lib/metaActivity';
import type { ReportLog } from './reportLogs';

interface ActivityState { key: string; logs: ReportLog[]; automatic: ReportLog[]; notice: string; loading: boolean }
const empty = { logs: [], automatic: [], notice: '', loading: false };
export function useMetaActivity(accountIds: string[], since: string, until: string, enabled = true) {
  const idsKey = [...new Set(accountIds)].sort().join(',');
  const key = `${idsKey}|${since}|${until}|${enabled}`;
  const [state, setState] = useState<ActivityState>({ ...empty, key: '' });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled || !idsKey) { setState({ ...empty, key }); return; }
    const controller = new AbortController();
    setState({ ...empty, key, loading: true });
    (async () => {
      const results = await Promise.allSettled(idsKey.split(',').map(async id => {
        const result = await fetchAccountActivity(id, since, until, controller.signal);
        // Missing time zones must be visible, not silently shift month boundaries.
        const zone = result.timezone_name || 'UTC';
        const entries = collectMetaActivity(result.data, id, since, until, result.currency || '', zone);
        return { ...entries, complete: result.complete, hasTimeZone: Boolean(result.timezone_name) };
      }));
      if (controller.signal.aborted) return;
      const logs: ReportLog[] = [], automatic: ReportLog[] = [], notices = new Set<string>();
      for (const result of results) {
        if (result.status === 'rejected') {
          notices.add('No se pudo consultar la actividad de Meta de una o más cuentas. Las notas se conservan; el historial puede estar incompleto.');
          continue;
        }
        logs.push(...result.value.logs); automatic.push(...result.value.automatic);
        if (!result.value.complete) notices.add('La actividad de Meta se consultó parcialmente. Volvé a actualizar o elegí un período más corto para revisar el historial.');
        if (!result.value.hasTimeZone) notices.add('Meta no informó la zona horaria de una cuenta; sus cambios se muestran según la fecha UTC.');
        if (result.value.unresolved) notices.add('Hay eventos de Meta sin fecha verificable que no se incluyeron.');
      }
      const sort = (a: ReportLog, b: ReportLog) => (a.sortDate || '').localeCompare(b.sortDate || '');
      setState({ key, logs: logs.sort(sort), automatic: automatic.sort(sort), notice: [...notices].join(' '), loading: false });
    })();
    return () => controller.abort();
  }, [key, idsKey, since, until, enabled, revision]);
  return { ...(state.key === key ? state : { ...empty, loading: enabled && Boolean(idsKey) }), refresh };
}
