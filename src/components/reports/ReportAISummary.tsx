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
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setSummary('Error: La conexión con Gemini AI no está activa. Asegúrate de que en "Settings > Secrets" aparezca "GEMINI_API_KEY" con el valor "AI Studio Free Tier" o tu propia clave. Luego, refresca la página.');
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const roas = metrics.revenue / (metrics.spend || 1);
      const cpa = metrics.spend / (metrics.purchases || metrics.messages || 1);
      
      const currentNotes = notes || [];
      const notesContext = currentNotes.length > 0 
        ? currentNotes.map(n => `- [${(n.timestamp || '').split('T')[0] || 'S/F'}] ${n.text}`).join('\n')
        : 'No hay notas registradas en la bitácora para este período.';

      const prompt = `
        Eres un experto analista de marketing digital para una agencia llamada Orion.
        Debes generar un resumen ejecutivo profesional para un cliente sobre el rendimiento de sus campañas durante el mes de ${monthName}.
        
        MÉTRICAS CLAVE DEL MES:
        - Inversión: ${formatCurrency(metrics.spend, metrics.currency)}
        - Facturación: ${formatCurrency(metrics.revenue, metrics.currency)}
        - ROAS: ×${formatDecimal(roas)}
        - CPA/CPR: ${formatCurrency(cpa, metrics.currency)}
        - CTR: ${formatDecimal(metrics.ctr)}%
        - Clics: ${metrics.clicks}
        
        BITÁCORA DE TRABAJO REALIZADO:
        ${notesContext}
        
        ESTRUCTURA DEL RESUMEN:
        1. Intro: Resumen del trabajo en la bitácora.
        2. Análisis: Comentar ROAS, Facturación y CPA.
        3. Próximos pasos: Sugerencias para el mes entrante.
        
        FORMATO: Profesional, directo, máximo 150 palabras. Sin negritas ni markdown especial. Castellano (Argentina).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error('La respuesta de la IA está vacía.');
      }

      setSummary(response.text);
    } catch (error: any) {
      console.error('Error generating summary:', error);
      let errorMsg = 'Error al conectar con la IA.';
      if (error?.message?.includes('API key')) {
        errorMsg = 'Error: Clave de API inválida o no configurada correctamente.';
      } else if (error?.message?.includes('quota')) {
        errorMsg = 'Error: Se ha alcanzado el límite de uso gratuito de la IA.';
      }
      setSummary(`${errorMsg} Detalles: ${error?.message || 'Error de conexión'}`);
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
