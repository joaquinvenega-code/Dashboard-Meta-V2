export const REPORT_TABS = [
  { id: 'weekly', title: 'Semanales', detail: 'Resumen automático' },
  { id: 'monthly', title: 'Mensuales', detail: 'Análisis completo' },
  { id: 'special', title: 'Especiales', detail: 'Eventos y períodos personalizados' },
] as const;

export type ReportTab = (typeof REPORT_TABS)[number]['id'];
