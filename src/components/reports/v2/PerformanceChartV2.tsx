import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { BarChart3, TrendingUp, ShoppingCart } from 'lucide-react';

interface PerformanceChartV2Props {
  data: {
    date: string;
    revenue: number;
    purchases: number;
  }[];
  currency: string;
}

export const PerformanceChartV2: React.FC<PerformanceChartV2Props> = ({ data, currency }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Métricas Consolidadas</h3>
          <p className="text-sm font-bold text-slate-900">Histórico Diario del Mes</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Facturado (ARS)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Ventas</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[350px] p-8 print:p-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
          <ComposedChart data={data} margin={{ top: 10, right: 25, left: 25, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
              dy={15}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
              tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
              label={{ value: 'Facturación', angle: -90, position: 'insideLeft', offset: -15, style: { fontSize: 9, fontWeight: 900, fill: '#94a3b8', textAnchor: 'middle' } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: '#38bdf8' }}
              dx={5}
              label={{ value: 'Ventas', angle: 90, position: 'insideRight', offset: -15, style: { fontSize: 9, fontWeight: 900, fill: '#94a3b8', textAnchor: 'middle' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                border: '1px solid #f1f5f9', 
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                fontSize: '11px',
                fontWeight: 800,
                padding: '16px',
                backdropFilter: 'blur(8px)'
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              formatter={(value: any, name: string) => [
                name === 'revenue' ? formatCurrency(value, currency) : value, 
                name === 'revenue' ? 'Facturado (ARS)' : 'Ventas'
              ]}
              labelStyle={{ color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '9px' }}
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="revenue" 
              name="revenue"
              stroke="#2563eb" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="purchases" 
              name="purchases"
              stroke="#38bdf8" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#38bdf8' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
