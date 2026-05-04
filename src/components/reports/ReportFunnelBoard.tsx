import React from 'react';
import { formatDecimal } from '../../lib/utils';

interface ReportFunnelBoardProps {
  spend: number;
  ctr: number;
  purchases: number;
  messages: number;
  tracking: 'ecommerce' | 'messaging' | 'both';
}

function TrafficFunnel({ impressions, clicks, actions, type }: { impressions: number, clicks: number, actions: number, type: 'ecommerce' | 'messaging' | 'both' }) {
  // Logic from the original TrafficFunnel helper
  const cpm = 12.45;

  return (
    <div className="w-full flex items-center gap-6 h-full py-4">
      {/* Funnel Vessel (Left) */}
      <div className="w-[140px] flex flex-col gap-1.5 items-center justify-center shrink-0">
        <div 
          className="w-full h-24 bg-red-500 shadow-xl flex items-center justify-center relative overflow-hidden"
          style={{ clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] relative z-10">VISIBILITY</span>
        </div>
        <div 
          className="w-[82%] h-24 bg-blue-400 shadow-lg flex items-center justify-center relative overflow-hidden -mt-0.5"
          style={{ clipPath: 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] relative z-10">ENGAGEMENT</span>
        </div>
        <div 
          className="w-[66%] h-24 bg-blue-600 shadow-2xl flex items-center justify-center relative overflow-hidden -mt-0.5"
          style={{ clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <hr className="absolute top-0 left-0 right-0 border-t border-white/20" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] relative z-10">CONVERSION</span>
        </div>
      </div>

      {/* Lateral Pills (Right) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Visibility Pill */}
        <div className="bg-red-500 rounded-r-[1.5rem] rounded-l-md p-4 flex items-center justify-between text-white shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-80" />
          <div className="relative z-10 flex-1 grid grid-cols-3 gap-2">
            <div className="space-y-0.5 border-r border-white/10 pr-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Impressions</span>
               <div className="text-[11px] font-black tracking-tight">{formatDecimal(impressions / 1000, 1)}K</div>
            </div>
            <div className="space-y-0.5 border-r border-white/10 px-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Abs. Top %</span>
               <div className="text-[11px] font-black tracking-tight">68.2%</div>
            </div>
            <div className="space-y-0.5 pl-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Avg. CPM</span>
               <div className="text-[11px] font-black tracking-tight">${cpm}</div>
            </div>
          </div>
        </div>

        {/* Engagement Pill */}
        <div className="bg-blue-400 rounded-r-[1.5rem] rounded-l-md p-4 flex items-center justify-between text-white shadow-md relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-400 opacity-80" />
          <div className="relative z-10 flex-1 grid grid-cols-3 gap-2">
            <div className="space-y-0.5 border-r border-white/10 pr-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Clicks</span>
               <div className="text-[11px] font-black tracking-tight">{formatDecimal(clicks)}</div>
            </div>
            <div className="space-y-0.5 border-r border-white/10 px-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">CTR</span>
               <div className="text-[11px] font-black tracking-tight">{(clicks / impressions * 100).toFixed(2)}%</div>
            </div>
            <div className="space-y-0.5 pl-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Avg. CPC</span>
               <div className="text-[11px] font-black tracking-tight">$0.5</div>
            </div>
          </div>
        </div>

        {/* Conversion Pill */}
        <div className="bg-blue-600 rounded-r-[1.5rem] rounded-l-md p-4 flex items-center justify-between text-white shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 opacity-80" />
          <div className="relative z-10 flex-1 grid grid-cols-3 gap-2">
            <div className="space-y-0.5 border-r border-white/10 pr-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Conversions</span>
               <div className="text-[11px] font-black tracking-tight">{actions}</div>
            </div>
            <div className="space-y-0.5 border-r border-white/10 px-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Conv. Rate</span>
               <div className="text-[11px] font-black tracking-tight">{(actions / clicks * 100).toFixed(2)}%</div>
            </div>
            <div className="space-y-0.5 pl-2">
               <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Clicks</span>
               <div className="text-[11px] font-black tracking-tight">{formatDecimal(clicks)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportFunnelBoard({ spend, ctr, purchases, messages, tracking }: ReportFunnelBoardProps) {
  const impressions = spend ? Math.floor(spend * 120) : 100000;
  const clicks = spend ? Math.floor(spend * 120 * (ctr / 100)) : 5000;
  const actions = purchases || messages || 0;

  return (
    <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 flex flex-col h-full">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-8 self-center">Embudo de Rendimiento</h3>
      <div className="flex-1 min-h-0">
        <TrafficFunnel 
          impressions={impressions}
          clicks={clicks}
          actions={actions}
          type={tracking}
        />
      </div>
    </div>
  );
}
