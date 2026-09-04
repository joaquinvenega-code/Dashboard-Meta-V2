import React, { useMemo, useState, useEffect } from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
import { adTrafficMetrics, AdTrafficMetrics } from '../../../lib/adTraffic';
import { REPORT_MODES, ReportMode } from '../reportData';
import { ExternalLink } from 'lucide-react';
import { safeMetaShareLink } from '../../../lib/adShareLink';
export interface AdAsset {
  id: string; name: string; thumbnail: string; originalThumbnailUrl?: string; previewUrl?: string; shareablePreviewUrl?: string;
  roas: number; purchases: number; revenue: number; spend: number; messages?: number; leads?: number; ctr?: number;
  clicks?: number; impressions?: number; traffic?: AdTrafficMetrics;
}
type SortCriteria = 'roas' | 'purchases' | 'revenue' | 'messages' | 'leads' | 'spend' | 'ctr';
function AdThumbnail({ ad }: { ad: AdAsset }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [ad.thumbnail, ad.originalThumbnailUrl]);
  return <div className="report-ad-media">{!failed && (ad.thumbnail || ad.originalThumbnailUrl) ? <img key={`${ad.thumbnail}|${ad.originalThumbnailUrl}`} src={ad.thumbnail || ad.originalThumbnailUrl} alt={`Creatividad: ${ad.name}`} loading="eager" referrerPolicy="no-referrer" onError={event => {
    const img = event.currentTarget;
    if (!img.dataset.retried && ad.originalThumbnailUrl && img.src !== ad.originalThumbnailUrl) { img.dataset.retried = 'true'; img.src = ad.originalThumbnailUrl; }
    else { setFailed(true); }
  }} /> : <span className="report-ad-noimage">Miniatura no disponible</span>}
  </div>;
}
function AdPreviewLink({ ad }: { ad: AdAsset }) {
  const shareLink = safeMetaShareLink(ad.shareablePreviewUrl);
  return shareLink
    ? <a className="report-ad-preview" href={shareLink} target="_blank" rel="noopener noreferrer" aria-label={`Ver anuncio en Meta: ${ad.name}`}><ExternalLink aria-hidden="true" /><span>Ver anuncio en Meta</span></a>
    : <span className="report-ad-preview is-unavailable"><ExternalLink aria-hidden="true" /><span>Enlace no disponible</span></span>;
}
export function AssetPerformanceV2({ assets, mode = 'ecommerce', currency = 'ARS' }: { assets: AdAsset[]; mode?: ReportMode; currency?: string }) {
  const event = REPORT_MODES[mode];
  const defaultSort = mode === 'ecommerce' ? 'roas' : event.key;
  const [sortBy, setSortBy] = useState<SortCriteria>(defaultSort);
  useEffect(() => setSortBy(defaultSort), [defaultSort]);
  const rows = useMemo(() => {
    const value = (ad: AdAsset) => sortBy === 'ctr' ? (ad.traffic ?? adTrafficMetrics(ad)).ctr || 0 : Number(ad[sortBy]) || 0;
    return [...assets].sort((a, b) => value(b) - value(a)).slice(0, 5);
  }, [assets, sortBy]);
  const labels = { roas: 'Mayor ROAS', purchases: 'Más compras', revenue: 'Mayor facturación', messages: 'Más mensajes', leads: 'Más clientes potenciales', spend: 'Mayor inversión', ctr: 'Mayor CTR' };
  const criteria: SortCriteria[] = mode !== 'ecommerce' ? [event.key, 'spend', 'ctr'] : ['roas', 'purchases', 'revenue'];
  return <section className="report-panel report-assets-gallery">
    <header className="report-panel-heading"><div><h3>Rendimiento de anuncios</h3><p>Hasta cinco anuncios destacados del período. Orden actual: {labels[sortBy].toLowerCase()}.</p></div>
      <label className="report-screen-only report-sort-label">Ordenar <select value={sortBy} onChange={event => setSortBy(event.target.value as SortCriteria)}>{criteria.map(key => <option key={key} value={key}>{labels[key]}</option>)}</select></label>
    </header>
    {rows.length ? <ol className="report-ad-cards">{rows.map((ad, index) => {
        const results = ad[event.key] || 0;
        const traffic = ad.traffic ?? adTrafficMetrics(ad);
        return <li className="report-ad-card" key={ad.id}>
          <AdThumbnail ad={ad} />
          <div className="report-ad-content"><div className="report-ad-heading"><span className="report-ad-rank">{String(index + 1).padStart(2, '0')}</span><h4>{ad.name}</h4></div>
            <dl aria-label="Resultados e inversión del anuncio" className={'report-ad-metrics' + (mode === 'ecommerce' ? ' is-ecommerce' : '')}>
              <div className="report-ad-result"><dt>{mode === 'messaging' ? 'Mensajes' : event.result}</dt><dd>{formatDecimal(results, 0)}</dd></div>
              <div><dt>{mode !== 'ecommerce' ? event.compactCost : 'ROAS'}</dt><dd>{mode !== 'ecommerce' ? results > 0 ? formatCurrency(ad.spend / results, currency) : '—' : formatDecimal(ad.roas, 2) + 'x'}</dd></div>
              <div><dt>Inversión</dt><dd>{formatCurrency(ad.spend, currency)}</dd></div>
              {mode === 'ecommerce' && <div><dt>Facturación</dt><dd>{formatCurrency(ad.revenue, currency)}</dd></div>}
            </dl>
            <dl className="report-ad-traffic" aria-label="Exposición y clics del anuncio">
              <div><dt>CTR (todos)</dt><dd>{traffic.ctr != null ? traffic.ctr > 0 && traffic.ctr < 0.01 ? '<0,01%' : formatDecimal(traffic.ctr, 2) + '%' : '—'}</dd></div>
              <div><dt>Clics (todos)</dt><dd>{traffic.clicks != null ? formatDecimal(traffic.clicks, 0) : '—'}</dd></div>
              <div><dt>Impresiones</dt><dd>{traffic.impressions != null ? formatDecimal(traffic.impressions, 0) : '—'}</dd></div>
              <div><dt>Costo / clic</dt><dd>{traffic.cpc != null ? traffic.cpc > 0 && traffic.cpc < 0.01 ? '<' + formatCurrency(0.01, currency, 2) : formatCurrency(traffic.cpc, currency, 2) : '—'}</dd></div>
            </dl>
            {results === 0 && <p className="report-ad-status">Sin resultados registrados</p>}
          </div>
          <AdPreviewLink ad={ad} />
        </li>;
      })}</ol> : <p className="report-empty">No hay anuncios disponibles para este período.</p>}
    <p className="report-caption">CTR: clics / impresiones. Se incluyen todos los clics, no solo los del enlace. Costo / clic: inversión / clics. —: dato no disponible o no calculable. Una posición alta no implica rentabilidad. {rows.length > 0 && 'Los botones abren la vista compartida de Meta desde el PDF; pueden requerir iniciar sesión.'}</p>
  </section>;
}
