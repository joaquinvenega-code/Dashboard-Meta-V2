import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { AccountNote } from '../../types';
import { formatCurrency, formatDecimal, cn } from '../../lib/utils';

interface ReportAISummaryProps {
  metrics: {
    spend: number;
    revenue: number;
    purchases: number;
    messages: number;
    currency: string;
    ctr: number;
    impressions: number;
    clicks: number;
  };
  notes: AccountNote[];
  monthName: string;
}

export function ReportAISummary({ metrics, notes, monthName }: ReportAISummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<'metrics' | 'full' | null>(null);

  const generateSummary = async (type: 'metrics' | 'full') => {
    setLoading(type);
    setSummary('');
    try {
      const response = await fetch('/api/generate-ai-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ metrics, notes, monthName, type })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Error de API V12:', response.status, text);
        
        let msg = `Error ${response.status}`;
        try { 
          const json = JSON.parse(text);
          msg = json.error || msg;
        } catch (e) {
          if (text.includes('405')) msg = 'Error 405 (Método no permitido). Intenta refrescar la página.';
          else msg = text.substring(0, 100);
        }
        throw new Error(msg);
      }

      const data = await response.json();
      setSummary(data.text || 'Sin respuesta de la IA.');
    } catch (error: any) {
      console.error('Error in AI Summary:', error);
      setSummary(`Fallo: ${error.message}. Verifica que el Secret GEMINI_API_KEY esté correctamente configurado.`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 mt-4 flex flex-col gap-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Resumen Ejecutivo</h3>
            <p className="text-xl font-black text-neutral-900 tracking-tight">Análisis Orion AI</p>
          </div>
        </div>
        
        {!summary ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => generateSummary('metrics')}
              disabled={!!loading}
              className="flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading === 'metrics' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Paso 1: Métricas
            </button>
            <button 
              onClick={() => generateSummary('full')}
              disabled={!!loading}
              className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading === 'full' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Paso 2: Resumen Total
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
             <button 
              onClick={() => generateSummary('metrics')}
              disabled={!!loading}
              className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer p-2 text-[8px] font-black uppercase tracking-widest"
            >
              Métricas
            </button>
            <button 
              onClick={() => generateSummary('full')}
              disabled={!!loading}
              className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer p-2 text-[8px] font-black uppercase tracking-widest"
            >
              Total
            </button>
            <button 
              onClick={() => setSummary('')}
              disabled={!!loading}
              className="text-neutral-400 hover:text-red-600 transition-colors cursor-pointer p-2"
              title="Limpiar"
            >
              <RefreshCw className={cn("w-4 h-4", !!loading && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      {summary ? (
        <div className="text-neutral-700 text-[11px] leading-relaxed whitespace-pre-wrap font-medium border-l-2 border-blue-200 pl-4 py-1">
          {summary}
        </div>
      ) : (
        <div className="text-neutral-400 text-[10px] uppercase font-black tracking-widest py-6 border-2 border-dashed border-neutral-100 rounded-lg flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 opacity-20" />
          <span>Haz clic en "Generar Lectura" para analizar el rendimiento del mes</span>
        </div>
      )}
    </div>
  );
}
