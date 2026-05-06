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

  // RUTA DE DEBUG V11
  app.get('/test-api-v11', (req, res) => {
    res.json({ status: 'ok', message: 'V11 Online', hasKey: !!process.env.GEMINI_API_KEY });
  });

  // --- API ENDPOINT (V11) ---
  // Usamos app.all para atrapar todo y manejamos el POST internamente
  app.all('/orchestrator-v11', async (req, res) => {
    console.log(`[V11-DEBUG] Petición ${req.method} recibida`);
    
    // CORS manual reforzado
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Solo se permite POST' });
    }

    try {
      const { metrics, notes, monthName, type = 'metrics' } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'undefined') {
        throw new Error('No se encontró la GEMINI_API_KEY en el servidor.');
      }

      if (!metrics) {
        return res.status(400).json({ error: 'Faltan métricas.' });
      }

      console.log('[V11-AI] Llamando a Gemini...');
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const roas = metrics.revenue / (metrics.spend || 1);
      
      let prompt = '';
      if (type === 'metrics') {
        prompt = `Analizá brevemente la performance de Meta Ads de ${monthName}: Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)}. Escribí un solo párrafo corto (máximo 80 palabras). Tono profesional. Castellano Argentina. Sin negritas.`;
      } else {
        const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas registradas.';
        prompt = `Resumen ejecutivo estratégico de ${monthName}. Métricas clave: ROAS ${roas.toFixed(2)}, Inversión ${metrics.spend}. Contexto de bitácora: ${notesContext}. Máximo 150 palabras. Tono ejecutivo. Castellano Argentina. Texto plano, sin negritas.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log('[V11-AI] Generación exitosa');
      res.json({ text });
    } catch (err: any) {
      console.error('[V11-ERROR]', err);
      res.status(500).json({ error: err.message || 'Error interno en el servidor v11' });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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
