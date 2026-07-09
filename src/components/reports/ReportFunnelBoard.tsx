import React from 'react';
import { BarChart3, HelpCircle } from 'lucide-react';
import { formatDecimal, formatCurrency } from '../../lib/utils';

interface ReportFunnelBoardProps {
  spend: number;
  ctr: number;
  purchases: number;
  messages: number;
  atc: number;
  viewContent?: number;
  tracking: 'ecommerce' | 'messaging' | 'both';
  impressions?: number;
  clicks?: number;
  reach?: number;
}

export function ReportFunnelBoard({ 
  spend = 0, 
  purchases = 0, 
  messages = 0, 
  atc = 0, 
  tracking, 
  impressions = 0, 
  clicks = 0,
  reach = 0
}: ReportFunnelBoardProps) {
  const isMessaging = tracking === 'messaging';

  // Metrics clean values (Ensure no negative or NaN)
  const realImpressions = Math.max(0, impressions);
  const realClicks = Math.max(0, clicks);
  const realAtc = Math.max(0, atc);
  const realPurchases = Math.max(0, purchases);
  const realMessages = Math.max(0, messages);
  const realSpend = Math.max(0, spend);
  const realReach = Math.max(0, reach || Math.round(realImpressions * 0.82));

  // Funnel steps configuration based on tracking type
  const steps = isMessaging ? [
    {
      label: "ALCANCE",
      value: realReach,
      formattedValue: formatDecimal(realReach, 0),
      color: "bg-emerald-200 text-emerald-950",
      pillBg: "bg-emerald-200 text-emerald-950",
      pillLabel: "Frecuencia Promedio",
      pillValue: realReach > 0 ? formatDecimal(realImpressions / realReach, 2) : "1,00",
      pillSuffix: "",
      pillCode: "FREQ"
    },
    {
      label: "IMPRESIONES",
      value: realImpressions,
      formattedValue: formatDecimal(realImpressions, 0),
      color: "bg-emerald-400 text-white",
      pillBg: "bg-emerald-400 text-white",
      pillLabel: "Tasa de Clic (CTR)",
      pillValue: realImpressions > 0 ? formatDecimal((realClicks / realImpressions) * 100) : "0,00",
      pillSuffix: "%",
      pillCode: "CTR"
    },
    {
      label: "CLICS EN EL ANUNCIO",
      value: realClicks,
      formattedValue: formatDecimal(realClicks, 0),
      color: "bg-emerald-600 text-white",
      pillBg: "bg-emerald-600 text-white",
      pillLabel: "Efectividad Chat",
      pillValue: realClicks > 0 ? formatDecimal((realMessages / realClicks) * 100) : "0,00",
      pillSuffix: "%",
      pillCode: "CHAT"
    },
    {
      label: "CONVERSIONES INICIADAS",
      value: realMessages,
      formattedValue: formatDecimal(realMessages, 0),
      color: "bg-emerald-950 text-white",
      pillBg: "bg-emerald-950 text-white",
      pillLabel: "Costo por Conversación",
      pillValue: realMessages > 0 ? formatCurrency(realSpend / realMessages, 'ARS') : "$0,00",
      pillSuffix: "",
      pillCode: "CPA"
    }
  ] : [
    {
      label: "IMPRESIONES",
      value: realImpressions,
      formattedValue: formatDecimal(realImpressions, 0),
      color: "bg-blue-200 text-blue-950",
      pillBg: "bg-blue-200 text-blue-950",
      pillLabel: "Tasa de Clic (CTR)",
      pillValue: realImpressions > 0 ? formatDecimal((realClicks / realImpressions) * 100) : "0,00",
      pillSuffix: "%",
      pillCode: "CTR"
    },
    {
      label: "CLICS EN EL ANUNCIO",
      value: realClicks,
      formattedValue: formatDecimal(realClicks, 0),
      color: "bg-blue-400 text-white",
      pillBg: "bg-blue-400 text-white",
      pillLabel: "Tasa de Carrito",
      pillValue: realClicks > 0 ? formatDecimal((realAtc / realClicks) * 100) : "0,00",
      pillSuffix: "%",
      pillCode: "ATC"
    },
    {
      label: "AGREGADOS AL CARRITO",
      value: realAtc,
      formattedValue: formatDecimal(realAtc, 0),
      color: "bg-blue-600 text-white",
      pillBg: "bg-blue-600 text-white",
      pillLabel: "Conversión Final",
      pillValue: realClicks > 0 ? formatDecimal((realPurchases / realClicks) * 100) : "0,00",
      pillSuffix: "%",
      pillCode: "CONV."
    },
    {
      label: "COMPRAS REALIZADAS",
      value: realPurchases,
      formattedValue: formatDecimal(realPurchases, 0),
      color: "bg-blue-950 text-white",
      pillBg: "bg-blue-950 text-white",
      pillLabel: "Costo Adquisición (CPA)",
      pillValue: realPurchases > 0 ? formatCurrency(realSpend / realPurchases, 'ARS') : "$0,00",
      pillSuffix: "",
      pillCode: "CPA"
    }
  ];

  // Specific widths and clipPaths for each of the 4 steps of the funnel
  const stepStyles = [
    { width: "w-full", clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)' },
    { width: "w-[86%]", clipPath: 'polygon(4.5% 0%, 95.5% 0%, 88% 100%, 12% 100%)' },
    { width: "w-[78%]", clipPath: 'polygon(9% 0%, 91% 0%, 84% 100%, 16% 100%)' },
    { width: "w-[69%]", clipPath: 'polygon(14% 0%, 86% 0%, 80% 100%, 20% 100%)' },
  ];

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMessaging ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          <BarChart3 className={`w-4 h-4 ${isMessaging ? 'text-emerald-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Visualización de Conversión</h3>
          <p className="text-xs font-bold text-slate-900">
            {isMessaging ? "Embudo Real de Mensajería" : "Embudo Real E-commerce"}
          </p>
        </div>
      </div>

      {/* Main Funnel Layout: Side-by-Side (Uncompressed) */}
      <div className="flex-1 flex flex-row items-center gap-4 min-h-[300px]">
        {/* Funnel Vessel (Left Column) */}
        <div className="w-[180px] md:w-[200px] flex flex-col items-center justify-center shrink-0" style={{ gap: '2px' }}>
          {steps.map((step, idx) => (
            <div 
              key={step.label}
              className={`${stepStyles[idx].width} h-[68px] ${step.color} shadow-xl flex items-center justify-center relative overflow-hidden`}
              style={{ clipPath: stepStyles[idx].clipPath }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent print:hidden" />
              <div className="flex flex-col items-center relative z-10 text-center px-1">
                <span className="text-[7px] font-black opacity-60 uppercase tracking-[0.1em]">{step.label}</span>
                <span className="text-[12px] font-black tracking-tight">{step.formattedValue}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Lateral Pills (Right Column) */}
        <div className="flex-1 flex flex-col justify-center min-w-0 shrink-0" style={{ gap: '2px' }}>
          {steps.map((step) => (
            <div 
              key={step.pillLabel}
              className={`h-[68px] ${step.pillBg} rounded-r-[1.5rem] rounded-l-md px-3 flex items-center justify-between shadow-lg relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/10 print:hidden" />
              <div className="relative z-10 flex flex-col min-w-0 justify-center">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-60 whitespace-nowrap">{step.pillLabel}</span>
                <div className="text-[14px] font-black tracking-tight">
                  {step.pillValue}{step.pillSuffix}
                </div>
              </div>
              <div className="relative z-10 text-[8px] font-bold opacity-30 uppercase tracking-[0.2em] ml-2 text-right shrink-0">
                {step.pillCode}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Glossary */}
      <div className="mt-6 pt-4 border-t border-slate-100 shrink-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 opacity-65" />
          Glosario del Embudo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[9px] text-slate-500 font-medium leading-relaxed">
          {isMessaging ? (
            <>
              <div><strong className="text-slate-800 font-bold block mb-0.5">1. Alcance y Frecuencia</strong>Número de personas únicas alcanzadas e impresiones promedio por persona única en la plataforma de anuncios.</div>
              <div><strong className="text-emerald-700 font-bold block mb-0.5">2. Efectividad Chat</strong>Porcentaje de clics que se tradujeron efectivamente en una conversación de mensajería iniciada en WhatsApp o Messenger.</div>
              <div><strong className="text-slate-800 font-bold block mb-0.5">3. Costo por Conversación</strong>Monto promedio invertido por cada conversación iniciada. Es el indicador real de adquisición para tus campañas.</div>
            </>
          ) : (
            <>
              <div><strong className="text-slate-800 font-bold block mb-0.5">1. Impresiones a Clics (CTR)</strong>Mide el atractivo visual y relevancia de tu anuncio frente a tu público objetivo.</div>
              <div><strong className="text-blue-700 font-bold block mb-0.5">2. Tasa de Carrito</strong>Mide la intención de compra real en el sitio web: cuántas personas añadieron productos tras hacer clic.</div>
              <div><strong className="text-indigo-700 font-bold block mb-0.5">3. Conversión y CPA</strong>La tasa de conversión final de compras versus clics y el costo de adquisición publicitaria real de cada venta.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
