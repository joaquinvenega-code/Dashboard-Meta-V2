import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Loader2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { CreativosGanadores } from './CreativosGanadores';

interface ReportGenerationViewProps {
  clientId: string;
  metaMetrics: any; // Provenientes del estado global del dashboard
}

export const ReportGenerationView: React.FC<ReportGenerationViewProps> = ({ clientId, metaMetrics }) => {
  const [logs, setLogs] = useState([]);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/bitacora/${clientId}`);
      const result = await res.json();
      if (result.success) setLogs(result.data.slice(-5)); // Solo últimos 5 para contexto
    } catch (err) {
      console.error("Error cargando la bitácora:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [clientId]);

  const handleSaveObservation = async (adId: string, observation: string) => {
    try {
      await fetch('/api/creativos/observacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          clientId,
          observation,
          metricLabel: 'ROAS', 
          metricValue: '5.2x'  
        })
      });
    } catch (err) {
      console.error("Error guardando observación de creativo:", err);
    }
  };

  const generateReportWithIA = async () => {
    setGenerating(true);
    setAiReport(null);
    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, metaMetrics })
      });
      const result = await res.json();
      if (result.success) {
        setAiReport(result.report);
      }
    } catch (err) {
      console.error("Error al compilar informe con Gemini:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 p-6 animate-in fade-in duration-500">
      
      <header className="text-center space-y-2">
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Asistente de Cierre Estratégico</h2>
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Validación de contexto previo a generación con Gemini 1.5</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lado Izquierdo: Contexto de Gestión (Lectura solamente) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-500">1</div>
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Contexto de Gestión</h3>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            {loadingLogs ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500"/></div>
            ) : (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-[11px] border-b border-slate-800/50 pb-2">
                    <span className="text-blue-400 font-bold shrink-0">{log.date}</span>
                    <span className="text-slate-400 leading-relaxed">{log.description}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-[10px] text-slate-600 italic">No hay acciones recientes para procesar.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Lo que suma Valor REAL -> Análisis de Creativos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-500">2</div>
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Insights de Creativos</h3>
          </div>
          <CreativosGanadores onSaveObservation={handleSaveObservation} />
        </div>
      </div>

      {/* Botón de Generación Principal */}
      <div className="pt-8 border-t border-slate-800 flex flex-col items-center">
        <button
          onClick={generateReportWithIA}
          disabled={generating}
          className="group relative bg-white text-slate-950 font-black uppercase tracking-[0.2em] px-10 py-4 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <div className="relative z-10 flex items-center gap-3">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-blue-600" />}
            <span>Generar Reporte Estratégico</span>
          </div>
        </button>
      </div>

      {/* Resultado IA */}
      {aiReport && (
        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-700">
          <div className="flex items-center gap-2 pb-6 border-b border-slate-800 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-500"/>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest">Borrador Estratégico Listado</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Procesado por Gemini 1.5 Flash</p>
            </div>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans prose prose-invert max-w-none bg-slate-950/50 p-6 rounded-xl border border-slate-800">
            {aiReport}
          </div>
          <div className="mt-8 flex justify-end">
            <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 flex items-center gap-2">
              <PlusCircle className="w-4 h-4"/>
              Convertir en Nota de Cuenta
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
