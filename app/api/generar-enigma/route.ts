import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

// Función que reintenta la llamada a Gemini si falla por saturación o límite de cuota
async function generateWithRetry(
  model: any,
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      const status = error?.status;
      // Si es error temporal (503 o 429), esperamos y reintentamos
      if ((status === 503 || status === 429) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s...
        console.log(`Reintento ${i + 1} en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Máximo de reintentos alcanzado");
}

export async function GET() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // ← más fiable que 2.5 en hora punta
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
    });

    const prompt = `Eres un autor de novelas de misterio...`; // (PEGA AQUÍ EL PROMPT COMPLETO DE DIFICULTAD ALTA)

    const text = await generateWithRetry(model, prompt);

    // Intentamos parsear; si falla, mostramos el texto en crudo para depurar
    let enigmaGenerado;
    try {
      enigmaGenerado = JSON.parse(text);
    } catch (parseError) {
      console.error("Respuesta no JSON de Gemini:", text);
      throw new Error("La IA devolvió un formato inesperado. Vuelve a intentarlo.");
    }

    if (
      !enigmaGenerado.historia ||
      !enigmaGenerado.sospechosos ||
      !enigmaGenerado.culpable_secreto
    ) {
      throw new Error("Faltan campos en la respuesta JSON");
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
      { error: "Error al generar el enigma" },
      { status: 500 }
    );
  }
}