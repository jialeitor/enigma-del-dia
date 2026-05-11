// app/api/generar-enigma/route.ts
import { supabase } from "@/lib/supabaseClient";

// La nueva URL base para OpenRouter
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Función para llamar a OpenRouter con el modelo Gemma 4 gratuito
async function generateWithGemma4(prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // Identifica tu app (buena práctica)
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Enigma del Día"
    },
    body: JSON.stringify({
      "model": "google/gemma-4-31b-it:free", // Modelo gratuito en OpenRouter
      "messages": [
        {
          "role": "system",
          "content": "Eres un asistente que responde EXCLUSIVAMENTE con objetos JSON válidos, sin markdown ni texto adicional."
        },
        {
          "role": "user",
          "content": prompt
        }
      ],
      "temperature": 0.7,
      "max_tokens": 600,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Error de OpenRouter: ${data.error.message}`);
  }

  // La respuesta viene en un formato similar al de OpenAI
  return data.choices[0].message.content;
}

export async function GET() {
  try {
    // 1. Tu prompt de siempre (sin cambios)
    const prompt = `Eres un autor de novelas de misterio galardonado...`; // <-- ¡PEGA AQUÍ TU PROMPT COMPLETO!

    // 2. Usamos la nueva función que acabamos de crear
    const text = await generateWithGemma4(prompt);

    // 3. Parseamos y guardamos en Supabase... (el resto de tu código sigue igual)
    let enigmaGenerado;
    try {
      enigmaGenerado = JSON.parse(text);
    } catch (parseError) {
      console.error("Respuesta no JSON:", text);
      throw new Error("La IA devolvió un formato inesperado.");
    }

    if (!enigmaGenerado.historia || !enigmaGenerado.sospechosos || !enigmaGenerado.culpable_secreto) {
      throw new Error("Faltan campos en el JSON de la historia");
    }

    const { data, error } = await supabase
      .from("enigmas_diarios")
      .insert({
        fecha: new Date().toISOString().split("T")[0],
        historia: enigmaGenerado.historia,
        sospechosos: enigmaGenerado.sospechosos,
        culpable_secreto: enigmaGenerado.culpable_secreto,
      })
      .select();

    if (error) throw error;

    return Response.json(data[0]);
  } catch (error) {
    console.error("Error general:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}