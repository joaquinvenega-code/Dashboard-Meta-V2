import type { Ad, AdAccount, DailyMetric } from '../types';
import type { ReportLog } from '../components/reports/reportLogs';
import type { Portfolio } from './weeklyReports';

export interface WeeklySnapshot {
  account: AdAccount;
  portfolio: Portfolio;
  period: { since: string; until: string };
  daily: DailyMetric[];
  ads: Ad[];
  activity: { logs: ReportLog[]; automatic: ReportLog[]; notice: string };
}
