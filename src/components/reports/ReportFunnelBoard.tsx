import React from 'react';
import { formatDecimal } from '../../lib/utils';

interface ReportFunnelBoardProps {
  spend: number;
  ctr: number;
  purchases: number;
  messages: number;
  atc: number;
  tracking: 'ecommerce' | 'messaging' | 'both';
}

function TrafficFunnel({ impressions, clicks, pageViews, atc, purchases }: { 
  impressions: number, 
  clicks: number, 
  pageViews: number,
  atc: number,
  purchases: number 
}) {
  const cpm = 12.45;

  return (
    <div className="w-full flex items-center gap-6 h-full py-4">
      {/* Funnel Vessel (Left) */}
      <div className="w-[140px] flex flex-col gap-1 items-center justify-center shrink-0">
        <div 
          className="w-full h-[68px] bg-red-500 shadow-xl flex items-center justify-center relative overflow-hidden"
          style={{ clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="flex flex-col items-center relative z-10">
            <span className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em]">CLICS</span>
            <span className="text-[12px] font-black text-white tracking-tight">{formatDecimal(clicks)}</span>
          </div>
        </div>
        <div 
          className="w-[84%] h-[68px] bg-blue-400 shadow-lg flex items-center justify-center relative overflow-hidden -mt-0.5"
          style={{ clipPath: 'polygon(4.8% 0%, 95.2% 0%, 86% 100%, 14% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="flex flex-col items-center relative z-10">
            <span className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em]">VISITA A PÁGINA</span>
            <span className="text-[12px] font-black text-white tracking-tight">{formatDecimal(pageViews)}</span>
          </div>
        </div>
        <div 
          className="w-[72%] h-[68px] bg-blue-500 shadow-xl flex items-center justify-center relative overflow-hidden -mt-0.5"
          style={{ clipPath: 'polygon(10.5% 0%, 89.5% 0%, 81% 100%, 19% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="flex flex-col items-center relative z-10">
            <span className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em]">AGREGADOS</span>
            <span className="text-[12px] font-black text-white tracking-tight">{formatDecimal(atc)}</span>
          </div>
        </div>
        <div 
          className="w-[61%] h-[68px] bg-blue-700 shadow-2xl flex items-center justify-center relative overflow-hidden -mt-0.5"
          style={{ clipPath: 'polygon(15.5% 0%, 84.5% 0%, 78% 100%, 22% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="flex flex-col items-center relative z-10">
            <span className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em]">COMPRAS</span>
            <span className="text-[12px] font-black text-white tracking-tight">{formatDecimal(purchases)}</span>
          </div>
        </div>
      </div>

      {/* Lateral Pills (Right) */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 h-full justify-between py-1">
        {/* Tasa de Clics (CTR) */}
        <div className="bg-red-500 rounded-r-[1.5rem] rounded-l-md p-3 flex items-center justify-between text-white shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-80" />
          <div className="relative z-10 flex-0.5 flex flex-col">
             <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Tasa de clic</span>
             <div className="text-[14px] font-black tracking-tight">{(clicks / impressions * 100).toFixed(2)}%</div>
          </div>
          <div className="relative z-10 text-[8px] font-bold opacity-30 uppercase tracking-[0.3em]">CTR</div>
        </div>

        {/* Tasa de Visita a Página */}
        <div className="bg-blue-400 rounded-r-[1.5rem] rounded-l-md p-3 flex items-center justify-between text-white shadow-md relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400 opacity-80" />
          <div className="relative z-10 flex-0.5 flex flex-col">
             <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Tasa de visita a página</span>
             <div className="text-[14px] font-black tracking-tight">{(pageViews / clicks * 100).toFixed(2)}%</div>
          </div>
          <div className="relative z-10 text-[8px] font-bold opacity-30 uppercase tracking-[0.3em]">Page View Rate</div>
        </div>

        {/* Tasa de Agregado al Carrito */}
        <div className="bg-blue-500 rounded-r-[1.5rem] rounded-l-md p-3 flex items-center justify-between text-white shadow-lg relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 opacity-80" />
          <div className="relative z-10 flex-0.5 flex flex-col">
             <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Tasa de agregados</span>
             <div className="text-[14px] font-black tracking-tight">{(atc / pageViews * 100).toFixed(2)}%</div>
          </div>
          <div className="relative z-10 text-[8px] font-bold opacity-30 uppercase tracking-[0.3em]">ATC Rate</div>
        </div>

        {/* Tasa de Compras (Conversion Rate) */}
        <div className="bg-blue-700 rounded-r-[1.5rem] rounded-l-md p-3 flex items-center justify-between text-white shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-800 to-blue-700 opacity-80" />
          <div className="relative z-10 flex-0.5 flex flex-col">
             <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Tasa de compras</span>
             <div className="text-[14px] font-black tracking-tight">{(purchases / atc * 100).toFixed(2)}%</div>
          </div>
          <div className="relative z-10 text-[8px] font-bold opacity-30 uppercase tracking-[0.3em]">ROAS Target</div>
        </div>
      </div>
    </div>
  );
}

export function ReportFunnelBoard({ spend, ctr, purchases, messages, atc, tracking }: ReportFunnelBoardProps) {
  const impressions = spend ? Math.floor(spend * 120) : 100000;
  const clicks = spend ? Math.floor(spend * 120 * (ctr / 100)) : 5000;
  // Estimate page views if not specific, usually 80-90% of clicks
  const pageViews = Math.floor(clicks * 0.85);
  // Ensure atc is at least higher than purchases for visual sanity in mock data
  const finalAtc = Math.max(atc || Math.floor(pageViews * 0.1), purchases * 2);
  const finalPurchases = purchases || messages || 0;

  return (
    <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 flex flex-col h-full overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-6 self-center">Embudo de Rendimiento</h3>
      <div className="flex-1 min-h-0">
        <TrafficFunnel 
          impressions={impressions}
          clicks={clicks}
          pageViews={pageViews}
          atc={finalAtc}
          purchases={finalPurchases}
        />
      </div>
    </div>
  );
}
