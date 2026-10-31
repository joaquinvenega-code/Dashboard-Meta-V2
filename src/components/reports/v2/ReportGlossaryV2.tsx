import React from 'react';
import { ReportMode } from '../reportData';
export function ReportGlossaryV2({ mode = 'ecommerce', concise = false }: { mode?: ReportMode; concise?: boolean }) {
  const terms = concise ? ({
    messaging: [['Mensajes', 'Conversaciones iniciadas atribuidas a anuncios, no mensajes enviados.'], ['Costo / mensaje', 'Inversión dividida por conversaciones iniciadas.'], ['CTR', 'Porcentaje de clics sobre impresiones.']],
    leads: [['Cliente potencial', 'Contacto atribuido por Meta; no equivale a una venta.'], ['CPL', 'Inversión dividida por clientes potenciales.'], ['CTR', 'Porcentaje de clics sobre impresiones.']],
    ecommerce: [['ROAS', 'Ingresos atribuidos ÷ inversión publicitaria; no descuenta costos.'], ['Costo / compra', 'Inversión dividida por compras atribuidas.'], ['CTR', 'Porcentaje de clics sobre impresiones.']],
  } satisfies Record<ReportMode, string[][]>)[mode] : mode === 'leads' ? [
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
