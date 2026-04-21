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
}

export interface Ad {
  id: string;
  name: string;
  spend: number;
  purchases: number;
  revenue: number;
  ctr: number;
  roas: number;
  thumbnail: string | null;
  previewUrl: string | null;
  dailySeries?: DailyMetric[];
}

export interface DailyMetric {
  date: string;
  spend: number;
  purchases: number;
  revenue: number;
  roas: number;
}

export interface ClientGroup {
  id: string;
  name: string;
  accountIds: string[];
}
