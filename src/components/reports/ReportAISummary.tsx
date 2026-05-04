import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
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
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const roas = metrics.revenue / (metrics.spend || 1);
      const cpa = metrics.spend / (metrics.purchases || metrics.messages || 1);
      
      const notesContext = notes.length > 0 
        ? notes.map(n => `- [${n.timestamp.split('T')[0]}] ${n.text}`).join('\n')
        : 'No hay notas registradas en la bitácora para este período.';

      const prompt = `
        Eres un experto analista de marketing digital para una agencia llamada Orion.
        Debes generar un resumen ejecutivo profesional para un cliente sobre el rendimiento de sus campañas durante el mes de ${monthName}.
        
        MÉTRICAS DEL MES:
        - Inversión: ${formatCurrency(metrics.spend, metrics.currency)}
        - Facturación: ${formatCurrency(metrics.revenue, metrics.currency)}
        - ROAS: ×${formatDecimal(roas)}
        - CPA/CPR: ${formatCurrency(cpa, metrics.currency)}
        - CTR: ${formatDecimal(metrics.ctr)}%
        - Impresiones: ${metrics.impressions}
        - Clics: ${metrics.clicks}
        
        BITÁCORA DE CAMBIOS Y TRABAJO REALIZADO:
        ${notesContext}
        
        INSTRUCCIONES PARA EL RESUMEN:
        1. Comienza con una breve introducción sobre el trabajo realizado basado en la bitácora.
        2. Analiza los rendimientos clave (Facturación, ROAS, CPA).
        3. Menciona la variación o tendencia general observada.
        4. Proporciona 2-3 sugerencias concretas para el mes siguiente para mejorar los resultados.
        
        FORMATO:
        Utiliza un tono profesional, directo y alentador. 
        Escribe en párrafos claros. No uses más de 200 palabras.
        El idioma debe ser Español (Argentina/Latinoamérica).
        NO utilices negritas ni formatos Markdown complejos, solo texto plano con saltos de línea.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setSummary(response.text || 'No se pudo generar el resumen.');
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('Error al generar el resumen. Por favor, verifica la configuración de la API.');
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resumen del Informe</h3>
            <p className="text-xs font-black text-neutral-900">Análisis Inteligente por Orion AI</p>
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
