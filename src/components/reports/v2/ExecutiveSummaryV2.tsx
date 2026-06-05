import React from 'react';
import { Info } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

interface KPIProps {
  label: string;
  value: string;
}

const KPICard = ({ label, value }: KPIProps) => {
  return (
    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl print:p-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 print:text-[8px]">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl lg:text-3xl font-black text-slate-900 truncate print:text-lg print:-tracking-wide print:overflow-visible print:whitespace-normal">{value}</h4>
      </div>
    </div>
  );
};

interface ExecutiveSummaryV2Props {
  metrics: {
    spend: number;
    purchases: number;
    roas: number;
    revenue: number;
  };
  narrative: string;
  onNarrativeChange: (value: string) => void;
  isEditing: boolean;
}

export const ExecutiveSummaryV2: React.FC<ExecutiveSummaryV2Props> = ({ 
  metrics, 
  narrative, 
  onNarrativeChange,
  isEditing
}) => {
  return (
    <section className="space-y-6 print:space-y-3">
      <div className="flex items-center gap-3 mb-2 print:mb-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">01</div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumen Ejecutivo</h3>
      </div>

      <div className="space-y-4 print:space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" />
          Status General y Análisis Narrativo
        </div>
        {isEditing ? (
          <textarea
            value={narrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            placeholder="Escribe el resumen ejecutivo para el cliente..."
            className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {narrative || "No se ha ingresado un resumen narrativo para este período."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4">
        <KPICard 
          label="Inversión" 
          value={formatCurrency(metrics.spend, 'ARS')} 
        />
        <KPICard 
          label="Conversiones" 
          value={metrics.purchases.toString()} 
        />
        <KPICard 
          label="ROAS Promedio" 
          value={`${metrics.roas.toFixed(2)}x`} 
        />
        <KPICard 
          label="Facturación Total" 
          value={formatCurrency(metrics.revenue, 'ARS')} 
        />
      </div>
    </section>
  );
};

