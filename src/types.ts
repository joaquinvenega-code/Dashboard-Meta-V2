export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
  // Insights
  spend?: number;
  clicks?: number;
  ctr?: number;
  revenue?: number;
  purchases?: number;
  addToCart?: number;
  checkouts?: number;
  costPerPurchase?: number;
  messages?: number;
  costPerMessage?: number;
  messagesReal?: number;
  costPerMessageReal?: number;
  impressions?: number;
}

export interface AccountSettings {
  objective: number;
  budget: number;
  currency: string;
  tracking: 'ecommerce' | 'messaging' | 'both';
  customName?: string;
  customLogo?: string;
  observations?: string;
  visibleMetrics?: string[];
}

export interface Ad {
  id: string;
  name: string;
  spend: number;
  clicks?: number;
  purchases: number;
  revenue: number;
  messages?: number;
  ctr: number;
  roas: number;
  thumbnail: string | null;
  previewUrl: string | null;
  dailySeries?: DailyMetric[];
  adsetId?: string;
}

export interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  funnelStage?: 'TOFU' | 'MOFU' | 'BOFU';
}

export interface DailyMetric {
  date: string;
  spend: number;
  clicks?: number;
  purchases: number;
  revenue: number;
  messages?: number;
  roas: number;
}

export interface ClientGroup {
  id: string;
  name: string;
  accountIds: string[];
}

export type AlertType = 'performance' | 'budget' | 'anomaly' | 'health';
export type AlertMetric = 'roas' | 'cpa' | 'spend' | 'frequency' | 'ctr' | 'cpc';
export type AlertCondition = 'greater_than' | 'less_than' | 'change_percent';

export interface AlertRule {
  id: string;
  name: string;
  accountId: string; // "all" for all accounts
  type: AlertType;
  metric?: AlertMetric;
  condition?: AlertCondition;
  value: number;
  timeframe: 'today' | 'last_7d' | 'last_30d';
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  isActive: boolean;
  lastTriggered?: string;
}

export interface InAppNotification {
  id: string;
  ruleId: string;
  accountId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high';
}
