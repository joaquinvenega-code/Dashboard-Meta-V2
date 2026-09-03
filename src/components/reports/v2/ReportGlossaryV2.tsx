import React from 'react';
import { ReportMode } from '../reportData';
export function ReportGlossaryV2({ mode = 'ecommerce' }: { mode?: ReportMode }) {
  const terms = mode === 'leads' ? [
    ['Cliente potencial', 'Evento lead atribuido por Meta. No equivale necesariamente a una persona única, un contacto calificado o una venta.'],
    ['CPL', 'Inversión dividida por clientes potenciales. Sin leads no se puede calcular este costo.'],
    ['CTR', 'Clics divididos por impresiones. Indica la tasa de clic, no la tasa de captación de clientes potenciales.'],
  ] : mode === 'messaging' ? [
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
