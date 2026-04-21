import React from 'react';
import { AdAccount, Ad, AccountSettings } from '../types';
import { formatCurrency, formatNumber, formatDecimal, cn } from '../lib/utils';
import { Printer, X } from 'lucide-react';

interface IndividualReportProps {
  account: AdAccount;
  settings: AccountSettings;
  dateLabel: string;
  onClose: () => void;
}

export function IndividualReport({ account, settings, dateLabel, onClose }: IndividualReportProps) {
  const roas = account.spend && account.spend > 0 ? (account.revenue || 0) / account.spend : 0;
  const showMessaging = settings.tracking === 'messaging' || settings.tracking === 'both' || (account.messagesReal && account.messagesReal > 0);

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto print:static print:overflow-visible">
      {/* Top Bar (Non-printing) */}
      <div className="sticky top-0 bg-neutral-900 text-white p-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="font-bold">Reporte Individual: {account.name}</h2>
          <span className="text-xs text-neutral-400">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-12 print:p-0 print:max-w-none">
        {/* Header */}
        <header className="mb-12 flex justify-between items-start border-b-2 border-neutral-100 pb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Informe de Rendimiento</h1>
            <p className="text-neutral-500 font-medium">Meta Ads Dashboard — Individual Report</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600">{account.name}</div>
            <div className="text-sm text-neutral-400 mt-1">{dateLabel}</div>
          </div>
        </header>

        {/* Global Metrics Grid */}
        <section className="mb-12">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Métricas Generales</h3>
          <div className="grid grid-cols-3 gap-6">
            <ReportMetric label="Inversión" value={formatCurrency(account.spend || 0, account.currency)} />
            <ReportMetric label="Facturación" value={formatCurrency(account.revenue || 0, account.currency)} />
            <ReportMetric label="ROAS" value={`×${formatDecimal(roas)}`} highlight />
            <ReportMetric label="Compras" value={formatNumber(account.purchases || 0)} />
            {showMessaging && (
              <>
                <ReportMetric label="Mensajes" value={formatNumber(account.messagesReal || 0)} />
                <ReportMetric label="Costo/Mensaje" value={account.costPerMessageReal ? formatCurrency(account.costPerMessageReal, account.currency) : '—'} />
              </>
            )}
          </div>
        </section>

        {/* KPI Analysis (Simplified) */}
        <section className="mb-12 grid grid-cols-2 gap-8">
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Eficiencia de Conversión
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Costo por Compra</span>
                <span className="font-bold">{account.costPerPurchase ? formatCurrency(account.costPerPurchase, account.currency) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">CTR (Clics en el enlace)</span>
                <span className="font-bold">{formatDecimal(account.ctr || 0, 2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Impresiones</span>
                <span className="font-bold">{formatNumber(account.impressions || 0)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Cumplimiento de Objetivos
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Objetivo Mensual</span>
                <span className="font-bold">{settings.objective ? formatCurrency(settings.objective, settings.currency) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Progreso</span>
                <span className="font-bold">{settings.objective ? Math.round(((account.revenue || 0) / settings.objective) * 100) + '%' : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Presupuesto Ejecutado</span>
                <span className="font-bold">{settings.budget ? Math.round(((account.spend || 0) / settings.budget) * 100) + '%' : '—'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Note: In a real implementation we would pass the "Anuncios Ganadores" here too 
            but for the demo we'll show a placeholder as they are fetched dynamically 
            in the expansion. We could fetch them here as well or pass them as props.
        */}
        <footer className="mt-20 pt-8 border-t border-neutral-100 text-center text-neutral-400 text-xs">
          Este informe ha sido generado automáticamente por Control ROAS Dashboard.
          &copy; {new Date().getFullYear()} — Análisis de rendimiento publicitario.
        </footer>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="border border-neutral-100 p-6 rounded-2xl">
      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">{label}</div>
      <div className={cn("text-2xl font-black", highlight && "text-blue-600")}>{value}</div>
    </div>
  );
}
