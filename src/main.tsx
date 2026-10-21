import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const WeeklyPrintApp = lazy(() => import('./components/WeeklyPrintApp'));
const weeklyRunner = import.meta.env.VITE_REPORT_RUNNER === 'true'
  && ['localhost', '127.0.0.1'].includes(location.hostname)
  && location.hash === '#weekly-print';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {weeklyRunner ? <Suspense fallback={<p>Cargando…</p>}><WeeklyPrintApp /></Suspense> : <App />}
  </StrictMode>,
);
