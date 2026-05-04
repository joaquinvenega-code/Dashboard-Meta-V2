import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Area, 
  Line 
} from 'recharts';

interface ReportTrendChartProps {
  data: any[];
}

export function ReportTrendChart({ data }: ReportTrendChartProps) {
  return (
    <div className="bg-[#0a0a0a] rounded-md p-8 border border-white/5 flex flex-col shadow-2xl h-full">
      <div className="flex items-center justify-between mb-8">
         <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Rendimiento Temporal</h3>
            <p className="text-lg font-black text-white">Facturación vs Inversión</p>
         </div>
         <div className="flex gap-6">
            <div className="flex items-center gap-2.5">
               <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
               <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Facturación</span>
            </div>
            <div className="flex items-center gap-2.5">
               <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
               <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Inversión</span>
            </div>
         </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" strokeWidth={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#666" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              yAxisId="left" 
              stroke="#10b981" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            <YAxis 
              yAxisId="right" 
              stroke="#3b82f6" 
              orientation="right" 
              fontSize={8} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip 
               contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px' }}
               itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#666' }} />
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Facturación" fill="url(#colorRevenue)" stroke="#10b981" strokeWidth={3} />
            <Line yAxisId="right" type="monotone" dataKey="spend" name="Inversión" stroke="#3b82f6" strokeWidth={3} dot={false} strokeLinecap="round" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
