import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExecutiveSummaryV2 } from './v2/ExecutiveSummaryV2';
import { ReportFunnelBoard } from './ReportFunnelBoard';
import { PlacementsChartV2 } from './v2/PlacementsChartV2';
import { PerformanceChartV2 } from './v2/PerformanceChartV2';
import { AssetPerformanceV2, AdAsset } from './v2/AssetPerformanceV2';
import { DemographicsGeographyV2 } from './v2/DemographicsGeographyV2';
import { RoadmapSectionV2 } from './v2/RoadmapSectionV2';
import { ReportGlossaryV2 } from './v2/ReportGlossaryV2';
import { GeographicSummary } from './GeographicSummary';
import { ManagementTimelineV2 } from './v2/ManagementTimelineV2';
import type { ReportLog } from './reportLogs';
import { DailyReportPoint, DemographicSegment, GeographicResult, PlacementBasis, PlacementResult, RegionResult, ReportMetrics, ReportMode, REPORT_MODES } from './reportData';

export interface MonthlyReportDocumentProps {
  name: string; logo?: string; month: string; mode: ReportMode; theme?: 'light' | 'dark';
  metrics: ReportMetrics; dataAvailable?: boolean; daily: DailyReportPoint[]; assets: AdAsset[];
  demographics: DemographicSegment[]; countries: GeographicResult[]; regions: RegionResult[];
  placements: PlacementResult[]; placementBasis: PlacementBasis;
  texts: { narrative?: string; learnings?: string; actionPlan?: string; clientRequests?: string };
  onUpdate: (field: string, value: string) => void; isEditing: boolean;
  logs: ReportLog[]; logsNotice?: string;
}

export function MonthlyReportDocument(props: MonthlyReportDocumentProps) {
  const { name, logo, month, mode, metrics, texts, isEditing, onUpdate } = props;
  const event = REPORT_MODES[mode];
  const results = metrics[event.key] || 0;
  const hasManagement = props.logs.length > 0 || Boolean(texts.learnings?.trim() || texts.actionPlan?.trim() || texts.clientRequests?.trim());
  const hasAds = props.assets.length > 0;
  const titles = ['Resumen y conversión', 'Evolución y audiencias', ...(hasAds ? ['Creatividades y resultados'] : []), 'Mapa de actividad', ...(hasManagement ? ['Bitácora y próximos pasos'] : [])];
  const geographyIndex = hasAds ? 3 : 2;
  const header = (index: number) => <header className="report-sheet-header">
    <div className="report-client">{logo && <img src={logo} alt="" referrerPolicy="no-referrer" />}<div><span>Informe mensual · {event.label}</span><h1>{name}</h1></div></div>
    <div className="report-period"><strong>{format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es })}</strong><span>{index + 1}. {titles[index]}</span></div>
  </header>;
  const footer = (index: number) => <footer className="report-sheet-footer"><span>Orion · Informe privado</span><span>Bloque {index + 1} / {titles.length} · {titles[index]}</span></footer>;
  const timeline = <ManagementTimelineV2 logs={props.logs} notice={props.logsNotice} />;
  if (props.dataAvailable === false) return <article className="report-editorial"><section className="report-sheet">{header(0)}<section className="report-panel"><h3>No hay métricas disponibles</h3><p>Revisá la cuenta, el período y la conexión con Meta antes de exportar. La bitácora se conserva independientemente de las métricas.</p></section>{timeline}</section></article>;
  return <article className={'report-editorial' + (props.theme === 'dark' ? ' report-editorial-dark' : '')}>
    <section className="report-sheet report-sheet-overview">
      {header(0)}
      <ExecutiveSummaryV2 metrics={metrics} dataAvailable={props.dataAvailable} narrative={texts.narrative || ''} onNarrativeChange={value => onUpdate('narrative', value)} isEditing={isEditing} mode={mode} />
      <div className="report-conversion-grid">
        <ReportFunnelBoard {...metrics} tracking={mode} />
        <PlacementsChartV2 data={props.placements} basis={props.placementBasis} currency={metrics.currency} />
      </div>
      <aside className="report-reading-guide"><h3>Cómo interpretar la conversión</h3><div>
        <p><strong>{mode !== 'ecommerce' ? 'Alcance y frecuencia.' : 'Impresiones y clics.'}</strong> {mode !== 'ecommerce' ? 'El alcance corresponde a personas únicas del período. La frecuencia indica cuántas impresiones recibe cada persona, en promedio.' : 'Las impresiones cuentan exposiciones al anuncio. El CTR relaciona clics con impresiones.'}</p>
        <p><strong>{event.transition}.</strong> Relaciona {event.result.toLowerCase()} con clics en anuncios. No representa un seguimiento individual de usuarios.</p>
        <p><strong>{mode === 'leads' ? 'Costo por cliente potencial (CPL).' : 'Costo por resultado.'}</strong> Inversión dividida por {event.result.toLowerCase()}. {mode === 'leads' ? 'Un lead atribuido por Meta no equivale a una venta ni garantiza un contacto calificado.' : 'Es una medida de costo publicitario, no una conclusión sobre rentabilidad.'}</p>
      </div></aside>
      {footer(0)}
    </section>
    <section className="report-sheet report-sheet-performance">
      {header(1)}
      <PerformanceChartV2 data={props.daily} currency={metrics.currency} mode={mode} expectedResults={results} />
      <DemographicsGeographyV2 demoData={props.demographics} currency={metrics.currency} />
      {!hasAds && <AssetPerformanceV2 assets={props.assets} currency={metrics.currency} mode={mode} />}
      {footer(1)}
    </section>
    {hasAds && <section className="report-sheet report-sheet-creatives">
      {header(2)}
      <AssetPerformanceV2 assets={props.assets} currency={metrics.currency} mode={mode} />
      {footer(2)}
    </section>}
    <section className="report-sheet report-sheet-geography">
      {header(geographyIndex)}
      <GeographicSummary countries={props.countries} regions={props.regions} expectedResults={results} mode={mode} currency={metrics.currency} />
      {!hasManagement && timeline}
      {!hasManagement && <div className="report-screen-only"><RoadmapSectionV2 learnings="" actionPlan="" clientRequests="" onUpdate={onUpdate} isEditing={isEditing} /></div>}
      {footer(geographyIndex)}
    </section>
    {hasManagement && <section className="report-sheet report-sheet-management">
      {header(geographyIndex + 1)}{timeline}
      <RoadmapSectionV2 learnings={texts.learnings || ''} actionPlan={texts.actionPlan || ''} clientRequests={texts.clientRequests || ''} onUpdate={onUpdate} isEditing={isEditing} />
      <ReportGlossaryV2 mode={mode} />{footer(geographyIndex + 1)}
    </section>}
  </article>;
}
