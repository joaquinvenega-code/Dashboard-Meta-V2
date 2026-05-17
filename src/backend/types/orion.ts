export type LogCategory = 'estructura' | 'optimizacion' | 'escalado' | 'testing';

export interface BitacoraLog {
  id: string;
  clientId: string;
  date: string; // ISO String o Formato DD/MM
  category: LogCategory;
  description: string;
}

export interface AdObservation {
  adId: string;
  clientId: string;
  observation: string;
  metricLabel: string;
  metricValue: string;
}
