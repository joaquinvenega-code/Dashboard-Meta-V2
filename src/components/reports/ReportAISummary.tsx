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
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setSummary('');
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ metrics, notes, monthName })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Sin cuerpo');
        console.error('Error del servidor:', response.status, text);
        
        if (response.status === 405) {
          throw new Error('El servidor no permite esta operación (405). Intenta recargar la página o espera unos segundos.');
        }

        let errorData = { error: '' };
        try {
          if (text.startsWith('{')) errorData = JSON.parse(text);
        } catch (e) {
          throw new Error(`Servidor: ${response.status} - ${text.substring(0, 50).replace(/<[^>]*>/g, '')}`);
        }
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.text || 'No se pudo generar el resumen.');
    } catch (error: any) {
      console.error('Error generating summary:', error);
      setSummary(`Error: ${error?.message || 'Error de conexión'}. Si el error persiste, verifica la clave GEMINI_API_KEY en Settings.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-50 rounded-xl p-8 border border-neutral-100 mt-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
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
          <button 
            onClick={generateSummary}
            disabled={loading}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loading ? 'Generando...' : 'Generar Lectura'}
          </button>
        ) : (
          <button 
            onClick={generateSummary}
            disabled={loading}
            className="text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer p-2"
            title="Regenerar resumen"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
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
