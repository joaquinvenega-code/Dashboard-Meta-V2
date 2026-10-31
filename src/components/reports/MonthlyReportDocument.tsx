import React, { useState } from 'react';
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
import { ReportAgencyBrand } from './ReportAgencyBrand';
import { ManagementTimelineV2 } from './v2/ManagementTimelineV2';
import type { ReportLog } from './reportLogs';
import { DailyReportPoint, DemographicSegment, GeographicResult, PlacementBasis, PlacementResult, RegionResult, ReportMetrics, ReportMode, REPORT_MODES } from './reportData';

export interface MonthlyReportDocumentProps {
  name: string; logo?: string; month: string; mode: ReportMode; theme?: 'light' | 'dark';
  agencyName?: string; agencyLogo?: string;
  metrics: ReportMetrics; dataAvailable?: boolean; daily: DailyReportPoint[]; assets: AdAsset[];
  demographics: DemographicSegment[]; countries: GeographicResult[]; regions: RegionResult[];
  placements: PlacementResult[]; placementBasis: PlacementBasis;
  texts: { narrative?: string; learnings?: string; actionPlan?: string; clientRequests?: string };
  onUpdate: (field: string, value: string) => void; isEditing: boolean;
  logs: ReportLog[]; logsNotice?: string;
  special?: { title: string; objective: string; since: string; until: string; scope: string };
  sections?: { performance: boolean; assets: boolean; geography: boolean; management: boolean };
}

export function MonthlyReportDocument(props: MonthlyReportDocumentProps) {
  const { name, logo, month, mode, metrics, texts, isEditing, onUpdate } = props;
  const [failedLogo, setFailedLogo] = useState<string>();
  const event = REPORT_MODES[mode];
  const concise = Boolean(props.special);
  const sections = props.sections || { performance: true, assets: true, geography: true, management: true };
  const results = metrics[event.key] || 0;
  const hasManagement = sections.management && (props.logs.length > 0 || Boolean(texts.learnings?.trim() || texts.actionPlan?.trim() || texts.clientRequests?.trim()) || Boolean(props.special && isEditing));
  const hasAds = sections.assets && props.assets.length > 0;
  const titles = ['Resumen y conversión', ...(sections.performance ? ['Evolución y audiencias'] : []), ...(hasAds ? ['Creatividades y resultados'] : []), ...(sections.geography ? ['Mapa de actividad'] : []), ...(hasManagement ? ['Bitácora y próximos pasos'] : [])];
  const geographyIndex = 1 + Number(sections.performance) + Number(hasAds);
  const managementIndex = geographyIndex + Number(sections.geography);
  const header = (index: number) => <header className="report-sheet-header">
    <div className="report-client">{logo && logo !== failedLogo && <img src={logo} alt={`Logo de ${name}`} referrerPolicy="no-referrer" onError={() => setFailedLogo(logo)} />}<div><span>{props.special ? 'Informe especial' : 'Informe mensual'} · {event.label}</span><h1>{name}</h1></div></div>
    <ReportAgencyBrand name={props.agencyName} logo={props.agencyLogo} />
    <div className="report-period"><strong>{props.special ? `${format(parseISO(props.special.since), 'dd/MM/yyyy')} – ${format(parseISO(props.special.until), 'dd/MM/yyyy')}` : format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es })}</strong><span>{index + 1}. {titles[index]}</span></div>
  </header>;
  const footer = (index: number) => <footer className="report-sheet-footer"><span>Orion · Informe privado</span><span>Bloque {index + 1} / {titles.length} · {titles[index]}</span></footer>;
  const timeline = <ManagementTimelineV2 concise={concise} logs={props.logs} notice={props.logsNotice} />;
  if (props.dataAvailable === false) return <article className="report-editorial"><section className="report-sheet">{header(0)}<section className="report-panel"><h3>No hay métricas disponibles</h3><p>Revisá la cuenta, el período y la conexión con Meta antes de exportar. La bitácora se conserva independientemente de las métricas.</p></section>{timeline}</section></article>;
  return <article className={'report-editorial' + (props.theme === 'dark' ? ' report-editorial-dark' : '')}>
    <section className="report-sheet report-sheet-overview">
      {header(0)}
      {props.special && <div className="report-special-context"><h2>{props.special.title}</h2>{props.special.objective && <p><strong>Objetivo del evento.</strong> {props.special.objective}</p>}<p><strong>Alcance.</strong> {props.special.scope}</p></div>}
      <ExecutiveSummaryV2 metrics={metrics} dataAvailable={props.dataAvailable} narrative={texts.narrative || ''} onNarrativeChange={value => onUpdate('narrative', value)} isEditing={isEditing} mode={mode} special={Boolean(props.special)} />
      <div className={props.special ? 'report-conversion-block' : undefined}>
      <div className="report-conversion-grid">
        <ReportFunnelBoard concise={concise} {...metrics} tracking={mode} />
        <PlacementsChartV2 concise={concise} data={props.placements} basis={props.placementBasis} currency={metrics.currency} />
      </div>
      {concise ? <ReportGlossaryV2 mode={mode} concise /> : <aside className="report-reading-guide"><h3>Cómo interpretar la conversión</h3><div>
        <p><strong>{mode !== 'ecommerce' ? 'Alcance y frecuencia.' : 'Impresiones y clics.'}</strong> {mode !== 'ecommerce' ? 'El alcance corresponde a personas únicas del período. La frecuencia indica cuántas impresiones recibe cada persona, en promedio.' : 'Las impresiones cuentan exposiciones al anuncio. El CTR relaciona clics con impresiones.'}</p>
        <p><strong>{event.transition}.</strong> Relaciona {event.result.toLowerCase()} con clics en anuncios. No representa un seguimiento individual de usuarios.</p>
        <p><strong>{mode === 'leads' ? 'Costo por cliente potencial (CPL).' : 'Costo por resultado.'}</strong> Inversión dividida por {event.result.toLowerCase()}. {mode === 'leads' ? 'Un lead atribuido por Meta no equivale a una venta ni garantiza un contacto calificado.' : 'Es una medida de costo publicitario, no una conclusión sobre rentabilidad.'}</p>
      </div></aside>}
      </div>
      {footer(0)}
    </section>
    {sections.performance && <section className="report-sheet report-sheet-performance">
      {header(1)}
      <PerformanceChartV2 concise={concise} data={props.daily} currency={metrics.currency} mode={mode} expectedResults={results} />
      <DemographicsGeographyV2 concise={concise} demoData={props.demographics} currency={metrics.currency} />
      {!hasAds && sections.assets && <AssetPerformanceV2 concise={concise} lockSort={Boolean(props.special)} assets={props.assets} currency={metrics.currency} mode={mode} />}
      {footer(1)}
    </section>}
    {hasAds && <section className="report-sheet report-sheet-creatives">
      {header(1 + Number(sections.performance))}
      <AssetPerformanceV2 concise={concise} lockSort={Boolean(props.special)} assets={props.assets} currency={metrics.currency} mode={mode} />
      {footer(1 + Number(sections.performance))}
    </section>}
    {sections.geography && <section className="report-sheet report-sheet-geography">
      {header(geographyIndex)}
      <GeographicSummary concise={concise} countries={props.countries} regions={props.regions} expectedResults={results} mode={mode} currency={metrics.currency} />
      {!hasManagement && sections.management && timeline}
      {!hasManagement && sections.management && <div className="report-screen-only"><RoadmapSectionV2 learnings="" actionPlan="" clientRequests="" onUpdate={onUpdate} isEditing={isEditing} /></div>}
      {footer(geographyIndex)}
    </section>}
    {hasManagement && <section className="report-sheet report-sheet-management">
      {header(managementIndex)}{timeline}
      <RoadmapSectionV2 learnings={texts.learnings || ''} actionPlan={texts.actionPlan || ''} clientRequests={texts.clientRequests || ''} onUpdate={onUpdate} isEditing={isEditing} />
      {!concise && <ReportGlossaryV2 mode={mode} />}{footer(managementIndex)}
    </section>}
  </article>;
}
