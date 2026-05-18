import React from 'react';
import { formatDecimal } from '../../../lib/utils';
import { Filter, MousePointer2, UserCheck, ShoppingCart, CreditCard } from 'lucide-react';

interface FunnelAnalysisV2Props {
  spend: number;
  impressions?: number;
  clicks?: number;
  viewContent?: number;
  atc?: number;
  purchases: number;
}

const FunnelStep = ({ 
  icon: Icon, 
  label, 
  value, 
  rate, 
  rateLabel, 
  colorClass,
  width 
}: { 
  icon: any, 
  label: string, 
  value: number, 
  rate?: number, 
  rateLabel?: string, 
  colorClass: string,
  width: string 
}) => (
  <div className="flex items-center gap-6 group">
    <div className="w-24 shrink-0 text-right">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-slate-900">{formatDecimal(value, 0)}</p>
    </div>
    
    <div className="flex-1 relative h-12 flex items-center">
      {/* Step Bar */}
      <div 
        className={`h-full ${colorClass} rounded-lg shadow-sm transition-all duration-700 ease-out flex items-center px-4 relative overflow-hidden`}
        style={{ width }}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Icon className="w-4 h-4 text-white/40" />
      </div>

      {/* Conversion Rate Tag */}
      {rate !== undefined && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm z-10">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{rateLabel}:</span>
          <span className="text-[10px] font-black text-blue-600">{rate.toFixed(2)}%</span>
        </div>
      )}
    </div>
  </div>
);

export const FunnelAnalysisV2: React.FC<FunnelAnalysisV2Props> = ({ 
  spend, 
  impressions: propImpressions, 
  clicks: propClicks, 
  viewContent, 
  atc, 
  purchases 
}) => {
  const impressions = propImpressions || Math.floor(spend * 120);
  const clicks = propClicks || Math.floor(impressions * 0.015);
  const pageViews = viewContent || Math.floor(clicks * 0.82);
  const finalAtc = atc || Math.floor(pageViews * 0.12);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">02</div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Análisis del Funnel</h3>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 space-y-10">
        <FunnelStep 
          icon={MousePointer2}
          label="Clics Gen."
          value={clicks}
          width="100%"
          colorClass="bg-blue-400"
        />
        
        <FunnelStep 
          icon={UserCheck}
          label="Visitas"
          value={pageViews}
          rate={(pageViews / (clicks || 1)) * 100}
          rateLabel="Eficiencia Clic"
          width="85%"
          colorClass="bg-blue-500"
        />

        <FunnelStep 
          icon={ShoppingCart}
          label="Carrito"
          value={finalAtc}
          rate={(finalAtc / (pageViews || 1)) * 100}
          rateLabel="Intención"
          width="70%"
          colorClass="bg-blue-600"
        />

        <FunnelStep 
          icon={CreditCard}
          label="Compras"
          value={purchases}
          rate={(purchases / (finalAtc || 1)) * 100}
          rateLabel="Cierre"
          width="55%"
          colorClass="bg-blue-700"
        />
      </div>

      <div className="flex justify-center gap-12 pt-4">
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CTR General</p>
          <p className="text-lg font-black text-slate-900">{((clicks / (impressions || 1)) * 100).toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CR Total</p>
          <p className="text-lg font-black text-slate-900">{((purchases / (clicks || 1)) * 100).toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Costo p/Compra</p>
          <p className="text-lg font-black text-slate-900">${(spend / (purchases || 1)).toFixed(0)}</p>
        </div>
      </div>
    </section>
  );
};
