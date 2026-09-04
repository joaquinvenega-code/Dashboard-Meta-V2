import { test } from 'node:test';
import assert from 'node:assert/strict';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { dashboardDatePresets, dateRangeError } from './dashboardDates';

test('previous month includes its full calendar across year and leap-year boundaries', () => {
  for (const [now, since, until] of [
    ['2026-09-04', '2026-08-01', '2026-08-31'],
    ['2026-01-15', '2025-12-01', '2025-12-31'],
    ['2024-03-31', '2024-02-01', '2024-02-29'],
    ['2025-03-01', '2025-02-01', '2025-02-28'],
  ]) {
    const preset = dashboardDatePresets(parseISO(now)).find(item => item.id === 'last_month')!;
    assert.equal(preset.since, since);
    assert.equal(preset.until, until);
  }
});

test('rolling date presets include exactly the labeled number of days', () => {
  for (const days of [7, 30]) {
    const preset = dashboardDatePresets(parseISO('2026-09-04')).find(item => item.id === `last_${days}`)!;
    assert.equal(differenceInCalendarDays(parseISO(preset.until), parseISO(preset.since)) + 1, days);
    assert.equal(preset.until, '2026-09-04');
  }
});

test('custom ranges reject incomplete, impossible, reversed and future dates', () => {
  for (const [since, until] of [['', '2026-08-31'], ['2026-02-30', '2026-03-01'], ['2026-08-31', '2026-08-01'], ['2026-09-01', '2026-09-05']]) {
    assert.ok(dateRangeError({ since, until }, '2026-09-04'));
  }
  assert.equal(dateRangeError({ since: '2026-09-04', until: '2026-09-04' }, '2026-09-04'), '');
});
