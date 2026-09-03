import React from 'react';
import { formatCurrency, formatDecimal } from '../../../lib/utils';
import { DailyReportPoint, ReportMode, REPORT_MODES } from '../reportData';

export function chartMaximum(values: Array<number | null | undefined>, integers = false) {
  const max = Math.max(0, ...values.filter((value): value is number => value != null && Number.isFinite(value)));
  if (max === 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(max)));
  const step = [1, 2, 5, 10].find(value => value * power >= max) || 10;
  return integers ? Math.max(1, Math.ceil(step * power)) : step * power;
}

export function PerformanceChartV2({ data, currency, mode = 'ecommerce', expectedResults }: { data: DailyReportPoint[]; currency: string; mode?: ReportMode; expectedResults?: number }) {
  const uid = React.useId().replace(/:/g, '');
  const event = REPORT_MODES[mode];
  const upperKey = event.key;
  const lowerKey = mode === 'ecommerce' ? 'revenue' : 'spend';
  const resultLabel = event.result;
  const moneyLabel = mode === 'ecommerce' ? 'Facturación' : 'Inversión';
  const upper = data.map(row => row[upperKey]);
  const lower = data.map(row => row[lowerKey]);
  const maxUpper = chartMaximum(upper, true);
  const maxLower = chartMaximum(lower);
  const peak = Math.max(0, ...upper.map(value => value || 0));
  const peakDays = data.filter(row => peak > 0 && row[upperKey] === peak).map(row => row.date);
  const total = upper.reduce<number>((sum, value) => sum + (value || 0), 0);
  const discrepancy = expectedResults != null && Math.abs(total - expectedResults) > 0.01;
  const reported = data.filter(row => row[upperKey] != null).length;
  const left = 62, right = 664, panelHeight = 88;
  const x = (index: number) => left + (right - left) * (index + 0.5) / Math.max(1, data.length);
  const y = (value: number, top: number, max: number) => top + panelHeight - value / max * panelHeight;
  const tickIndexes = data.map((_, index) => index).filter(index => index === 0 || index === data.length - 1 || index % Math.max(1, Math.ceil(data.length / 9)) === 0);
  const shortMoney = (value: number) => value === 0 ? '0' : value >= 1e6 ? (value / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M' : value >= 1000 ? (value / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' mil' : formatDecimal(value, value < 10 ? 1 : 0);
  const lineSegments: string[] = [];
  let segment = '';
  lower.forEach((value, index) => {
    if (value == null) { if (segment) lineSegments.push(segment); segment = ''; return; }
    segment += (segment ? ' L ' : 'M ') + x(index) + ' ' + y(value, 202, maxLower);
  });
  if (segment) lineSegments.push(segment);
  return <section className="report-panel report-daily">
    <header className="report-panel-heading"><h3>Evolución diaria</h3><p>Dos escalas independientes y las mismas fechas para comparar el comportamiento del mes.</p></header>
    {reported ? <>
      <svg className="report-daily-svg" viewBox="0 0 700 327" role="img" aria-labelledby={uid + '-title'}>
        <title id={uid + '-title'}>{`${resultLabel} y ${moneyLabel.toLowerCase()} por día. Cada panel utiliza su propia escala.`}</title>
        {[{ top: 40, max: maxUpper, label: resultLabel, color: '#059669', money: false }, { top: 202, max: maxLower, label: moneyLabel + ' (' + currency + ')', color: '#2563eb', money: true }].map(panel => <g key={panel.label}>
          <text x={left} y={panel.top - 16} className="report-svg-heading" fill={panel.color}>{panel.label}</text>
          {[0, panel.max / 2, panel.max].filter((value, index) => panel.money || Number.isInteger(value) || index !== 1).map(value => <g key={value}>
            <line x1={left} x2={right} y1={y(value, panel.top, panel.max)} y2={y(value, panel.top, panel.max)} stroke="#e2e8f0" strokeDasharray={value ? '3 4' : undefined} />
            <text x={left - 9} y={y(value, panel.top, panel.max) + 3} textAnchor="end" className="report-svg-tick">{panel.money ? shortMoney(value) : formatDecimal(value, 0)}</text>
          </g>)}
          {tickIndexes.map(index => <text key={index} x={x(index)} y={panel.top + panelHeight + 19} textAnchor="middle" className="report-svg-tick">{data[index].date}</text>)}
        </g>)}
        {data.map((row, index) => row[upperKey] == null ? null : <g key={row.date}>
          <title>{`${row.date}: ${formatDecimal(row[upperKey]!, 0)} ${resultLabel.toLowerCase()}`}</title>
          <rect x={x(index) - Math.min(6, 230 / data.length)} y={y(row[upperKey]!, 40, maxUpper)} width={Math.min(12, 460 / data.length)} height={Math.max(1, (row[upperKey] || 0) / maxUpper * panelHeight)} rx="2" fill={row[upperKey] === peak ? '#059669' : '#6ee7b7'} />
          {row[upperKey] === peak && peak > 0 && <text x={x(index)} y={y(peak, 40, maxUpper) - 5} textAnchor="middle" className="report-svg-tick" fill="#047857">{peak}</text>}
        </g>)}
        {lineSegments.map((path, index) => <path key={index} d={path} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />)}
        {data.map((row, index) => row[lowerKey] == null ? null : <circle key={row.date} cx={x(index)} cy={y(row[lowerKey]!, 202, maxLower)} r="2.5" fill="#2563eb"><title>{`${row.date}: ${formatCurrency(row[lowerKey]!, currency)}`}</title></circle>)}
      </svg>
      <div className="report-daily-notes">
        <p><strong>Pico de {resultLabel.toLowerCase()}:</strong> {peak > 0 ? formatDecimal(peak, 0) + ' · ' + peakDays.slice(0, 3).join(', ') + (peakDays.length > 3 ? ' y ' + (peakDays.length - 3) + ' días más' : '') : 'Sin resultados registrados.'}</p>
        <p>{reported} de {data.length} días con datos. Los días sin datos se muestran como huecos, no como ceros.</p>
      </div>
      {discrepancy && <p className="report-data-note">El histórico diario suma {formatDecimal(total, 0)} resultados; el resumen del período registra {formatDecimal(expectedResults!, 0)}. Son consultas separadas de Meta y la diferencia requiere revisión.</p>}
    </> : <p className="report-empty">No hay datos diarios disponibles para este período.</p>}
  </section>;
}
