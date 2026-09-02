import React, { useMemo, useState, useEffect } from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
export interface AdAsset {
  id: string; name: string; thumbnail: string; originalThumbnailUrl?: string; previewUrl?: string;
  roas: number; purchases: number; revenue: number; spend: number; messages?: number; ctr?: number;
}
type SortCriteria = 'roas' | 'purchases' | 'revenue' | 'messages' | 'spend' | 'ctr';
export function AssetPerformanceV2({ assets, mode = 'ecommerce', currency = 'ARS' }: { assets: AdAsset[]; mode?: 'ecommerce' | 'messaging'; currency?: string }) {
  const [sortBy, setSortBy] = useState<SortCriteria>(mode === 'messaging' ? 'messages' : 'roas');
  useEffect(() => setSortBy(mode === 'messaging' ? 'messages' : 'roas'), [mode]);
  const rows = useMemo(() => [...assets].sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0)).slice(0, 5), [assets, sortBy]);
  const labels = { roas: 'Mayor ROAS', purchases: 'Más compras', revenue: 'Mayor facturación', messages: 'Más mensajes', spend: 'Mayor inversión', ctr: 'Mayor CTR' };
  const criteria: SortCriteria[] = mode === 'messaging' ? ['messages', 'spend', 'ctr'] : ['roas', 'purchases', 'revenue'];
  return <section className="report-panel report-assets-table">
    <header className="report-panel-heading"><div><h3>Rendimiento de anuncios</h3><p>Hasta cinco anuncios de mayor inversión. Orden actual: {labels[sortBy].toLowerCase()}.</p></div>
      <label className="report-screen-only report-sort-label">Ordenar <select value={sortBy} onChange={event => setSortBy(event.target.value as SortCriteria)}>{criteria.map(key => <option key={key} value={key}>{labels[key]}</option>)}</select></label>
    </header>
    {rows.length ? <div className="report-table-scroll"><table>
      <thead><tr><th scope="col">Anuncio</th><th scope="col">{mode === 'messaging' ? 'Mensajes' : 'Compras'}</th><th scope="col">{mode === 'messaging' ? 'Costo / mensaje' : 'ROAS'}</th><th scope="col">Inversión</th>{mode === 'ecommerce' && <th scope="col">Facturación</th>}</tr></thead>
      <tbody>{rows.map((ad, index) => {
        const results = mode === 'messaging' ? ad.messages || 0 : ad.purchases;
        return <tr key={ad.id}><td><div className="report-ad-identity">
          <span className="report-ad-rank">{index + 1}</span>
          {ad.thumbnail ? <img src={ad.thumbnail} alt="" loading="eager" referrerPolicy="no-referrer" onError={event => { const img = event.currentTarget; if (!img.dataset.retried && ad.originalThumbnailUrl && img.src !== ad.originalThumbnailUrl) { img.dataset.retried = 'true'; img.src = ad.originalThumbnailUrl; } else { img.style.visibility = 'hidden'; } }} /> : <span className="report-ad-noimage">Sin imagen</span>}
          <div><span>{ad.name}</span>{results === 0 && <small>Sin resultados registrados</small>}{ad.previewUrl && <a className="report-screen-only" href={ad.previewUrl} target="_blank" rel="noopener noreferrer">Ver anuncio</a>}</div>
        </div></td><td>{formatDecimal(results, 0)}</td><td>{mode === 'messaging' ? results > 0 ? formatCurrency(ad.spend / results, currency) : '—' : formatDecimal(ad.roas, 2) + 'x'}</td><td>{formatCurrency(ad.spend, currency)}</td>{mode === 'ecommerce' && <td>{formatCurrency(ad.revenue, currency)}</td>}</tr>;
      })}</tbody>
    </table></div> : <p className="report-empty">No hay anuncios disponibles para este período.</p>}
    <p className="report-caption">Una posición alta en esta lista no implica rentabilidad. Sin resultados, el costo por resultado no se puede calcular.</p>
  </section>;
}
