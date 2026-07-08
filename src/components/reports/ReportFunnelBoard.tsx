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
}

export function ReportFunnelBoard({ 
  spend = 0, 
  purchases = 0, 
  messages = 0, 
  atc = 0, 
  tracking, 
  impressions = 0, 
  clicks = 0 
}: ReportFunnelBoardProps) {
  const isMessaging = tracking === 'messaging';

  // Metrics clean values (Ensure no negative or NaN)
  const realImpressions = Math.max(0, impressions);
  const realClicks = Math.max(0, clicks);
  const realAtc = Math.max(0, atc);
  const realPurchases = Math.max(0, purchases);
  const realMessages = Math.max(0, messages);
  const realSpend = Math.max(0, spend);

  // Messaging Funnel: 3 Levels
  // Ecommerce Funnel: 4 Levels
  const N = isMessaging ? 3 : 4;

  // Colors based on report type
  const isMsg = isMessaging;
  const color1 = isMsg ? "bg-emerald-300 text-emerald-950" : "bg-blue-200 text-blue-950";
  const color2 = isMsg ? "bg-emerald-500 text-white" : "bg-blue-400 text-white";
  const color3 = isMsg ? "bg-emerald-700 text-white" : "bg-blue-600 text-white";
  const color4 = "bg-blue-950 text-white";

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

      {/* Main Funnel Layout */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch gap-6 min-h-[300px]">
        {/* Funnel Shapes (Left) */}
        <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: '2px' }}>
          {isMessaging ? (
            <>
              {/* Step 1: Impresiones */}
              <div 
                className={`w-full h-[90px] ${color1} shadow-md flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }}
              >
                <span className="text-[8px] font-black opacity-60 uppercase tracking-widest">IMPRESIONES</span>
                <span className="text-base font-black tracking-tight mt-1">{formatDecimal(realImpressions, 0)}</span>
              </div>
              {/* Step 2: Clics */}
              <div 
                className={`w-[80%] h-[90px] ${color2} shadow-md flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' }}
              >
                <span className="text-[8px] font-black opacity-70 uppercase tracking-widest">CLICS EN EL ANUNCIO</span>
                <span className="text-base font-black tracking-tight mt-1">{formatDecimal(realClicks, 0)}</span>
              </div>
              {/* Step 3: Mensajes */}
              <div 
                className={`w-[68%] h-[90px] ${color3} shadow-lg flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)' }}
              >
                <span className="text-[8px] font-black opacity-80 uppercase tracking-widest">CONVERSACIONES INICIADAS</span>
                <span className="text-base font-black tracking-tight mt-1">{formatDecimal(realMessages, 0)}</span>
              </div>
            </>
          ) : (
            <>
              {/* Step 1: Impresiones */}
              <div 
                className={`w-full h-[68px] ${color1} shadow-md flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)' }}
              >
                <span className="text-[7px] font-black opacity-60 uppercase tracking-widest">IMPRESIONES</span>
                <span className="text-sm font-black tracking-tight mt-0.5">{formatDecimal(realImpressions, 0)}</span>
              </div>
              {/* Step 2: Clics */}
              <div 
                className={`w-[84%] h-[68px] ${color2} shadow-md flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }}
              >
                <span className="text-[7px] font-black opacity-70 uppercase tracking-widest">CLICS EN EL ANUNCIO</span>
                <span className="text-sm font-black tracking-tight mt-0.5">{formatDecimal(realClicks, 0)}</span>
              </div>
              {/* Step 3: ATC */}
              <div 
                className={`w-[71%] h-[68px] ${color3} shadow-md flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)' }}
              >
                <span className="text-[7px] font-black opacity-80 uppercase tracking-widest">AGREGADOS AL CARRITO</span>
                <span className="text-sm font-black tracking-tight mt-0.5">{formatDecimal(realAtc, 0)}</span>
              </div>
              {/* Step 4: Compras */}
              <div 
                className={`w-[59%] h-[68px] ${color4} shadow-lg flex flex-col items-center justify-center relative overflow-hidden`}
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' }}
              >
                <span className="text-[7px] font-black opacity-90 uppercase tracking-widest">COMPRAS REALIZADAS</span>
                <span className="text-sm font-black tracking-tight mt-0.5">{formatDecimal(realPurchases, 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Rates & KPIs (Right) */}
        <div className="w-full md:w-[220px] flex flex-col justify-center" style={{ gap: '6px' }}>
          {isMessaging ? (
            <>
              {/* CTR Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[88px] relative overflow-hidden">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Tasa de Clic (CTR)</span>
                  <span className="text-xs font-medium text-slate-500 block leading-tight">Clics por impresión</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-2">
                  {realImpressions > 0 ? formatDecimal((realClicks / realImpressions) * 100) : '0,00'}%
                </div>
              </div>

              {/* Chat conversion rate */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[88px] relative overflow-hidden">
                <div>
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Efectividad Chat</span>
                  <span className="text-xs font-medium text-slate-500 block leading-tight">Conversaciones vs clics</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-2">
                  {realClicks > 0 ? formatDecimal((realMessages / realClicks) * 100) : '0,00'}%
                </div>
              </div>

              {/* CPA Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[88px] relative overflow-hidden">
                <div>
                  <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-0.5">Costo por Conversación</span>
                  <span className="text-xs font-medium text-slate-500 block leading-tight">Inversión promedio</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-2">
                  {realMessages > 0 ? formatCurrency(realSpend / realMessages, 'ARS') : '$0,00'}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* CTR Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between h-[65px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Tasa de Clic (CTR)</span>
                  <span className="text-[12px] font-black text-slate-900 leading-none">
                    {realImpressions > 0 ? formatDecimal((realClicks / realImpressions) * 100) : '0,00'}%
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 leading-tight">Interés del anuncio</span>
              </div>

              {/* ATC Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between h-[65px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[7.5px] font-black text-blue-600 uppercase tracking-wider">Tasa de Carrito</span>
                  <span className="text-[12px] font-black text-slate-900 leading-none">
                    {realClicks > 0 ? formatDecimal((realAtc / realClicks) * 100) : '0,00'}%
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 leading-tight">Carritos por clic</span>
              </div>

              {/* Conversion rate Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between h-[65px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[7.5px] font-black text-indigo-600 uppercase tracking-wider">Conversión Final</span>
                  <span className="text-[12px] font-black text-slate-900 leading-none">
                    {realClicks > 0 ? formatDecimal((realPurchases / realClicks) * 100) : '0,00'}%
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 leading-tight">Compras por clic</span>
              </div>

              {/* CPA Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between h-[65px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[7.5px] font-black text-slate-700 uppercase tracking-wider">Costo Adquisición (CPA)</span>
                  <span className="text-[12px] font-black text-slate-900 leading-none">
                    {realPurchases > 0 ? formatCurrency(realSpend / realPurchases, 'ARS') : '$0,00'}
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 leading-tight">Costo por venta real</span>
              </div>
            </>
          )}
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
              <div><strong className="text-slate-800 font-bold block mb-0.5">1. Impresiones y Clics</strong>Número total de veces que se mostraron los anuncios y clics de enlace recibidos en la plataforma.</div>
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
