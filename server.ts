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

  // --- API DEFINITION V7 ---
  // Atraparlo TODO para evitar errores 405 (Método no permitido)
  app.all('/generate-report-v7', async (req, res) => {
    console.log(`[V7-LOG] ${req.method} a ${req.url}`);
    
    // Manejo manual de CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    const data = req.method === 'POST' ? req.body : req.query;
    const { metrics, notes, monthName, type = 'metrics' } = data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      console.error('[V7-ERROR] GEMINI_API_KEY no encontrada');
      return res.status(500).json({ error: 'Falta clave de IA en Settings.' });
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
        prompt = `SOS ANALISTA DE META ADS. Analizá: Inversión ${metrics.spend}, Facturación ${metrics.revenue}, ROAS: ×${roas.toFixed(2)} del mes ${monthName}. Párrafo corto (80 palabras). castellano Argentina. Sin negritas.`;
      } else {
        const notesContext = notes && notes.length > 0 ? notes.map((n: any) => `- ${n.text}`).join('\n') : 'Sin notas.';
        prompt = `SOS DIRECTOR ESTRATÉGICO. Resumen ejecutivo de ${monthName}. ROAS ${roas.toFixed(2)}, Inversión ${metrics.spend}. Bitácora: ${notesContext}. Max 150 palabras. Castellano Argentina. Sin negritas. Texto plano.`;
      }

      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (err: any) {
      console.error('[V7-ERROR]', err);
      res.status(500).json({ error: `Error IA: ${err.message}` });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
