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
  app.use(express.urlencoded({ extended: true }));

  // RUTA DE DEBUG V11
  app.get('/test-api-v11', (req, res) => {
    res.json({ status: 'ok', message: 'V11 Online', hasKey: !!process.env.GEMINI_API_KEY });
  });

  // --- API ENDPOINT V12 ---
  app.post('/api/generate-ai-report', async (req, res) => {
    console.log(`[API-V12] ${req.method} ${req.url}`);
    
    try {
      const { metrics, notes, monthName, type = 'metrics' } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'undefined') {
        return res.status(500).json({ error: 'Falta la API KEY en el servidor.' });
      }

      if (!metrics) {
        return res.status(400).json({ error: 'Faltan métricas.' });
      }

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
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[API-V12-ERROR]', err);
      res.status(500).json({ error: err.message || 'Error interno en el servidor AI' });
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
