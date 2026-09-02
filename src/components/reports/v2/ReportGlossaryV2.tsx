import React from 'react';
export function ReportGlossaryV2({ mode = 'ecommerce' }: { mode?: 'ecommerce' | 'messaging' }) {
  const terms = mode === 'messaging' ? [
    ['Mensajes', 'Conversaciones iniciadas atribuidas a anuncios; no equivale a cantidad de mensajes enviados.'],
    ['Costo / mensaje', 'Inversión dividida por conversaciones iniciadas. No mide rentabilidad ni calidad del contacto.'],
    ['CTR', 'Clics divididos por impresiones. Indica la tasa de clic, no la tasa de venta.'],
  ] : [
    ['ROAS', 'Facturación atribuida dividida por inversión publicitaria. No descuenta costos del negocio.'],
    ['CPA', 'Inversión dividida por compras atribuidas. Sin compras no se puede calcular.'],
    ['CTR', 'Clics divididos por impresiones. La facturación corresponde a ingresos atribuidos por Meta.'],
  ];
  return <aside className="report-glossary"><h3>Claves de lectura</h3><dl>{terms.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></aside>;
}
