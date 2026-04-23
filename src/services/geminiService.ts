import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAccountInsights(data: {
  name: string;
  spend: number;
  revenue: number;
  objective: number;
  budget: number;
  currency: string;
}) {
  const roas = data.spend > 0 ? (data.revenue / data.spend).toFixed(2) : "0.00";
  const progress = data.objective > 0 ? ((data.revenue / data.objective) * 100).toFixed(0) : "0";
  const budgetUsage = data.budget > 0 ? ((data.spend / data.budget) * 100).toFixed(0) : "0";

  const prompt = `
    Actúa como un experto Director de Performance de una agencia de Meta Ads.
    Analiza los siguientes datos de la cuenta "${data.name}":
    - Inversión actual: ${data.spend} ${data.currency}
    - Facturación actual: ${data.revenue} ${data.currency}
    - Objetivo de facturación mensual: ${data.objective} ${data.currency}
    - Presupuesto máximo mensual: ${data.budget} ${data.currency}
    - ROAS actual: ${roas}
    - Progreso hacia el objetivo: ${progress}%
    - Uso del presupuesto: ${budgetUsage}%

    Proporciona un análisis estratégico MUY BREVE (máximo 3 frases) sobre el estado de la cuenta y una recomendación de acción inmediata para el dueño de la agencia. 
    Sé directo, profesional y enfocado en resultados. No uses introducciones genéricas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "No se pudieron generar los insights en este momento.";
  }
}
