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

  // --- Rutas de Generación (Paso 1 y Paso 2) ---
  
  app.all('/orchestrator-metrics', async (req, res) => {
    console.log(`[SERVER] Request to /orchestrator-metrics: ${req.method}`);
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    const data = req.method === 'POST' ? req.body : req.query;
    const { metrics, monthName } = data;
    
    if (!metrics) return res.status(400).json({ error: 'Faltan métricas en el servidor' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Llave de IA no configurada' });

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      
      const prompt = `SOS UN ANALISTA DE META ADS. Analizá este mes (${monthName}): Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un párrafo de 80 palabras. Sin negritas. Castellano Argentina.`;

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[METRICS ERROR]', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.all('/orchestrator-full', async (req, res) => {
    console.log(`[SERVER] Request to /orchestrator-full: ${req.method}`);
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    const data = req.method === 'POST' ? req.body : req.query;
    const { metrics, notes, monthName } = data;
    
    if (!metrics) return res.status(400).json({ error: 'Faltan datos' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Llave de IA no configurada' });

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin datos extra.';

      const prompt = `SOS DIRECTOR ESTRATÉGICO. Resumen ejecutivo de ${monthName}. ROAS ${roas.toFixed(2)}, Inversión ${metrics.spend}. Bitácora: ${notesContext}. Máximo 150 palabras. Sin negritas. Texto plano. Castellano Argentina.`;

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[FULL ERROR]', err);
      res.status(500).json({ error: err.message });
    }
  });

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
