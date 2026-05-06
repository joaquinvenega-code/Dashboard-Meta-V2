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

  app.use(express.json());

  // Full CORS and logging
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- Rutas de la API ---
  const apiRouter = express.Router();

  // Paso 1: Solo métricas
  apiRouter.post('/v4/metrics-only', async (req, res) => {
    console.log('[API V4] METRICS ONLY REQUEST arrived');
    const { metrics, monthName } = req.body;
    
    if (!metrics) return res.status(400).json({ error: 'Faltan métricas' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      
      const prompt = `Analizá brevemente (max 80 palabras) el rendimiento de Meta Ads de ${monthName}.
      Métricas: Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}.
      Tono profesional, castellano de Argentina. Solo texto plano.`;

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[API V4] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Paso 2: Resumen Total
  apiRouter.post('/v4/full-summary', async (req, res) => {
    console.log('[API V4] FULL SUMMARY REQUEST arrived');
    const { metrics, notes, monthName } = req.body;
    
    if (!metrics) return res.status(400).json({ error: 'Faltan métricas' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas.';

      const prompt = `Resumen ejecutivo integral ${monthName}. ROAS: ${roas.toFixed(2)}, Inversión: ${metrics.spend}. 
      Bitácora: ${notesContext}.
      Máximo 180 palabras. Tono ejecutivo. Castellano Argentina. Solo texto plano.`;

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[API V4] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Montar el router
  app.use('/api', apiRouter);

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'online', 
      time: new Date().toISOString(), 
      hasKey: !!process.env.GEMINI_API_KEY 
    });
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
