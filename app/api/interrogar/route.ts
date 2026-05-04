// app/api/interrogar/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const { historia, sospechosos, culpableSecreto, pregunta } = await req.json();

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",  // mismo modelo que para generar
      generationConfig: {
        temperature: 0,            // CERO creatividad: solo lógica estricta
        maxOutputTokens: 5,        // solo va a decir una palabra
      },
    });

    // Prompt de árbitro implacable
    const prompt = `Eres un árbitro de un juego de misterio. Tu ÚNICA tarea es evaluar la pregunta del jugador y responder EXACTAMENTE con una de estas tres palabras: "Sí", "No", o "Irrelevante".

INFORMACIÓN DEL CASO (CONFIDENCIAL):
HISTORIA: """${historia}"""
SOSPECHOSOS: ${sospechosos.join(', ')}
CULPABLE SECRETO (NO REVELAR NUNCA): """${culpableSecreto}"""

PREGUNTA DEL JUGADOR: """${pregunta}"""

INSTRUCCIONES ESTRICTAS:
- La respuesta debe basarse ÚNICAMENTE en los hechos descritos en la historia y en la identidad del culpable secreto.
- "Sí": si la pregunta es lógica y la respuesta correcta es afirmativa según la historia.
- "No": si la pregunta es lógica y la respuesta correcta es negativa según la historia.
- "Irrelevante": si la pregunta no tiene relación con los hechos, menciona algo que no aparece en la historia, es ambigua o intenta directamente adivinar al culpable sin deducción (ej: "¿El culpable es el mayordomo?").
- BAJO NINGÚN CONCEPTO reveles el nombre del culpable ni des pistas adicionales.
- NO añadas ninguna palabra más. SOLO "Sí", "No" o "Irrelevante".`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const respuesta = response.text().trim();

    // Nos aseguramos de que la respuesta sea exactamente una de las tres
    const respuestasValidas = ["Sí", "No", "Irrelevante"];
    if (!respuestasValidas.includes(respuesta)) {
      // Si falla, devolvemos "Irrelevante" por seguridad
      return Response.json({ respuesta: "Irrelevante" });
    }

    return Response.json({ respuesta });

  } catch (error) {
    console.error("Error al interrogar:", error);
    return Response.json({ error: "Error al procesar la pregunta" }, { status: 500 });
  }
}