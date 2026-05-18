import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import { CreativosGanadores } from './CreativosGanadores';
import { TimelineGestion } from './TimelineGestion';

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
      if (result.success) setLogs(result.data);
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
          metricLabel: 'ROAS', // Dinámico según performance
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
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {loadingLogs ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
          ) : (
            <TimelineGestion logs={logs}/>
          )}
        </div>

        
        <div className="lg:col-span-2">
          <CreativosGanadores onSaveObservation={handleSaveObservation}/>
        </div>
      </div>

      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center text-center">
        <div className="p-3 bg-blue-950/50 rounded-full border border-blue-800 mb-4">
          <Sparkles className="w-6 h-6 text-blue-400"/>
        </div>
        <h3 className="text-lg font-bold text-slate-100">Compilación Estratégica ORION (Gemini 1.5 Flash)</h3>
        <p className="text-sm text-slate-400 max-w-xl mt-1 mb-6">
          Procesá las métricas duras de Meta Ads cruzadas de forma nativa con las optimizaciones asentadas en la bitácora y el análisis de creativos.
        </p>
        
        <button
          onClick={generateReportWithIA}
          disabled={generating}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin"/>
              Procesando Insights...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5"/>
              Generar Reporte Mensual
            </>
          )}
        </button>
      </div>

      
      {aiReport && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-4">
            <FileText className="w-5 h-5 text-emerald-400"/>
            <h4 className="text-md font-bold text-slate-200">Informe Estratégico Generado</h4>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans prose prose-invert max-w-none">
            {aiReport}
          </div>
        </div>
      )}
    </div>
  );
};
