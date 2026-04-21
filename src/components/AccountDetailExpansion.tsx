import React, { useState, useEffect } from 'react';
import { AdAccount, Ad, AccountSettings } from '../types';
import { formatCurrency, formatNumber, formatDecimal, cn } from '../lib/utils';
import { fetchTopAds, fetchDailySeries } from '../services/facebook';
import { Trophy, ExternalLink, RefreshCw, FileText } from 'lucide-react';

interface AccountDetailExpansionProps {
  account: AdAccount;
  settings: AccountSettings;
  dateRange: { since: string; until: string };
  onOpenReport: (account: AdAccount) => void;
}

export function AccountDetailExpansion({ account, settings, dateRange, onOpenReport }: AccountDetailExpansionProps) {
  const [topAds, setTopAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [sortAdsBy, setSortAdsBy] = useState('roas');

  const roas = account.spend && account.spend > 0 ? (account.revenue || 0) / account.spend : 0;
  
  const showMessaging = settings.tracking === 'messaging' || settings.tracking === 'both' || (account.messagesReal && account.messagesReal > 0);

  const loadAds = async () => {
    setLoadingAds(true);
    try {
      const ads = await fetchTopAds(account.id, dateRange.since, dateRange.until, 5, sortAdsBy);
      const adIds = ads.map(a => a.id);
      if (adIds.length > 0) {
        const daily = await fetchDailySeries(account.id, dateRange.since, dateRange.until, adIds);
        ads.forEach(ad => { ad.dailySeries = daily[ad.id] || []; });
      }
      setTopAds(ads);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, [account.id, sortAdsBy, dateRange.since, dateRange.until]);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 space-y-6">
      {/* Metrics Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricBox label="Inversión" value={formatCurrency(account.spend || 0, account.currency)} />
        <MetricBox label="Facturación" value={formatCurrency(account.revenue || 0, account.currency)} />
        <MetricBox label="ROAS" value={`×${formatDecimal(roas)}`} highlight />
        <MetricBox label="Compras" value={formatNumber(account.purchases || 0)} />
        
        {showMessaging && (
          <>
            <MetricBox label="Mensajes" value={formatNumber(account.messagesReal || 0)} />
            <MetricBox label="Costo/Mensaje" value={account.costPerMessageReal ? formatCurrency(account.costPerMessageReal, account.currency) : '—'} />
          </>
        )}
      </div>

      {/* Winning Ads Section */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Anuncios ganadores</h4>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={sortAdsBy}
              onChange={(e) => setSortAdsBy(e.target.value)}
              className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 outline-none"
            >
              <option value="roas">Ordenar por ROAS</option>
              <option value="purchases">Ordenar por Compras</option>
              <option value="revenue">Ordenar por Facturación</option>
            </select>
            <button 
              onClick={() => onOpenReport(account)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-3 h-3" />
              Ver Reporte PDF
            </button>
          </div>
        </div>

        {loadingAds ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-sm">Cargando anuncios...</span>
          </div>
        ) : topAds.length > 0 ? (
          <div className="space-y-4">
            {topAds.map((ad, idx) => (
              <div key={ad.id}>
                <AdCard ad={ad} rank={idx + 1} currency={account.currency} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-400 text-sm">
            No se encontraron anuncios con métricas en este período.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">{label}</div>
      <div className={cn("text-lg font-bold truncate", highlight && "text-blue-600 dark:text-blue-400")}>
        {value}
      </div>
    </div>
  );
}

function AdCard({ ad, rank, currency }: { ad: Ad, rank: number, currency: string }) {
  const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
  
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex flex-col lg:flex-row gap-4 shadow-sm group">
      {/* Thumbnail */}
      <div className="w-full lg:w-40 aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative shrink-0">
        <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          #{rank}
        </div>
        {ad.thumbnail ? (
          <img src={ad.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Sin imagen</div>
        )}
      </div>

      {/* Info & Metrics */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h5 className="text-xs font-bold truncate mb-3" title={ad.name}>{ad.name}</h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <AdMetric label="Inversión" value={formatCurrency(ad.spend, currency)} />
            <AdMetric label="Revenue" value={formatCurrency(ad.revenue, currency)} />
            <AdMetric label="ROAS" value={`×${formatDecimal(roas)}`} bold />
            <AdMetric label="Compras" value={formatNumber(ad.purchases)} />
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4 text-[10px] text-neutral-400 font-medium">
          <span>CTR: {formatDecimal(ad.ctr)}%</span>
          {ad.previewUrl && (
            <a 
              href={ad.previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver en Meta
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AdMetric({ label, value, bold }: { label: string, value: string, bold?: boolean }) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg">
      <div className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5 leading-none">{label}</div>
      <div className={cn("text-xs font-bold", bold && "text-blue-600 dark:text-blue-400")}>{value}</div>
    </div>
  );
}
