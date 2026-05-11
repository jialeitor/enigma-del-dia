// app/api/interrogar/route.ts

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Respaldo de emergencia: responde sin IA cuando la API falla
function respaldoLogico(
  pregunta: string,
  historia: string,
  sospechosos: string[],
  culpable: string
): string {
  const preguntaLower = pregunta.toLowerCase();

  // Si la pregunta menciona directamente a un sospechoso y pregunta si es culpable
  if (sospechosos.some((s) => preguntaLower.includes(s.toLowerCase()))) {
    if (
      preguntaLower.includes("culpable") ||
      preguntaLower.includes("fue él") ||
      preguntaLower.includes("fue ella") ||
      preguntaLower.includes("acusar") ||
      preguntaLower.includes("¿fue") ||
      preguntaLower.includes("es el culpable")
    ) {
      return "Irrelevante";
    }
    // Preguntar por otro detalle de un personaje (no decimos nada comprometedor)
    return "No";
  }

  // Si pregunta algo que no parece relacionado con la historia
  if (!historia.toLowerCase().includes(preguntaLower.split(" ")[0])) {
    return "Irrelevante";
  }

  return "No"; // por defecto, para no dar pistas
}

export async function POST(req: Request) {
  const { historia, sospechosos, culpableSecreto, pregunta } = await req.json();

  try {
    // Prompt estricto del árbitro (el mismo que ya usabas)
    const prompt = `Actúas como un árbitro de juego de misterio. Tu función es responder a las preguntas del jugador basándote ESTRICTAMENTE en la historia y en el culpable secreto que conoces.

INFORMACIÓN DEL CASO:
HISTORIA: """${historia}"""
SOSPECHOSOS: ${sospechosos.join(', ')}
CULPABLE SECRETO (¡PROHIBIDO REVELAR!): """${culpableSecreto}"""

PREGUNTA DEL JUGADOR: """${pregunta}"""

INSTRUCCIONES DE ÁRBITRO:
- Evalúa la pregunta basándote en la lógica de la historia y la identidad del culpable.
- Responde EXCLUSIVAMENTE con UNA de estas tres palabras: "Sí", "No" o "Irrelevante".
- "Sí" o "No": Solo si la pregunta puede responderse lógicamente con la información de la historia.
- "Irrelevante": Si la pregunta no tiene relación con los hechos, menciona cosas fuera de lugar o intenta adivinar al culpable directamente (ej: "¿Fue el mayordomo?").
- NO des pistas, NO hagas comentarios, NO reveles al culpable. Solo una palabra.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Enigma del Día",
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free", // Modelo gratuito Gemma 4 en OpenRouter
        messages: [
          {
            role: "system",
            content:
              "Eres un árbitro de juego. Solo respondes 'Sí', 'No' o 'Irrelevante'. Nada más.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 5,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Error OpenRouter: ${data.error.message}`);
    }

    const respuesta = data.choices[0].message.content.trim();
    const respuestasValidas = ["Sí", "No", "Irrelevante"];

    return Response.json({
      respuesta: respuestasValidas.includes(respuesta) ? respuesta : "Irrelevante",
    });
  } catch (error) {
    console.log("Usando árbitro de emergencia porque la IA falló:", error);
    const respuesta = respaldoLogico(pregunta, historia, sospechosos, culpableSecreto);
    return Response.json({ respuesta });
  }
}