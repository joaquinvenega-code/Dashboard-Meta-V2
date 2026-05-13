export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
  balance?: number;
  spend_cap?: string;
  amount_spent?: string;
  funding_source_details?: {
    id: string;
    type: string;
    display_string: string;
  };
  is_prepaid_account?: boolean;
  extended_credit_invoice_group?: any;
  prepaid_balance?: {
    amount: string;
    currency: string;
  };
  account_type?: string;
  // Insights
  spend?: number;
  clicks?: number;
  ctr?: number;
  revenue?: number;
  purchases?: number;
  addToCart?: number;
  viewContent?: number;
  checkouts?: number;
  costPerPurchase?: number;
  messages?: number;
  costPerMessage?: number;
  messagesReal?: number;
  costPerMessageReal?: number;
  impressions?: number;
}

export interface OfflineSaleEntry {
  id: string;
  amount: number;
  note: string;
  date: string;
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
  categoryId?: string;
  manualRevenueByMonth?: Record<string, number>;
  offlineSalesLogByMonth?: Record<string, OfflineSaleEntry[]>;
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

export interface AccountGroup {
  id: string;
  name: string;
  accountIds: string[];
}

export interface ClientCategory {
  id: string;
  name: string;
  color?: string;
}

export type AlertType = 'performance' | 'budget' | 'anomaly' | 'health';
export type AlertMetric = 'roas' | 'cpa' | 'spend' | 'frequency' | 'ctr' | 'cpc' | 'balance';
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

export interface AccountNote {
  id: string;
  accountId: string;
  text: string;
  timestamp: string;
  category: 'observation' | 'change' | 'meeting' | 'urgent';
  tags?: string[];
}

export interface DemographicData {
  age: string;
  gender: 'male' | 'female' | 'unknown';
  purchases: number;
  spend: number;
}

export interface GeographicData {
  region: string;
  city: string;
  purchases: number;
  spend: number;
  lat?: number;
  lng?: number;
}
