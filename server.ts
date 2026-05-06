import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware de logging global para ver qué está pasando
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // CORS robusto
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // --- NUEVA API UNIFICADA V6 ---
  app.post('/api/ai-summary-v6', async (req, res) => {
    console.log('[API V6] Recibida petición POST');
    const { metrics, notes, monthName, type = 'metrics' } = req.body;
    
    // Debug de lo que llega
    console.log('[API V6] Body data:', { monthName, type, hasMetrics: !!metrics });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[API V6] MISSING API KEY');
      return res.status(500).json({ error: 'Falta la clave GEMINI_API_KEY en Settings.' });
    }

    if (!metrics) {
      return res.status(400).json({ error: 'No se recibieron métricas.' });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `SOS UN ANALISTA DE META ADS. Analizá este mes (${monthName}): Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un párrafo corto (60-80 palabras). Sin negritas. Castellano Argentina.`;
      } else {
        const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas.';
        prompt = `SOS DIRECTOR ESTRATÉGICO. Resumen ejecutivo de ${monthName}. ROAS ${roas.toFixed(2)}, Inversión ${metrics.spend}. Bitácora: ${notesContext}. Máximo 150 palabras. Sin negritas. Castellano Argentina.`;
      }

      console.log('[API V6] Generando contenido con Gemini...');
      const result = await model.generateContent(prompt);
      const outputText = result.response.text();
      console.log('[API V6] Generación terminada');

      res.json({ text: outputText });
    } catch (err: any) {
      console.error('[API V6 ERROR]', err);
      res.status(500).json({ error: `Error de Gemini: ${err.message}` });
    }
  });

  // Ruta de test para ver si los GET funcionan en /api
  app.get('/api/ai-summary-v6', (req, res) => {
    res.json({ message: 'API V6 activa. Usá POST para generar resúmenes.' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
  });
}

startServer();
