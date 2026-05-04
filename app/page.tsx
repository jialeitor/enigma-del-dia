// app/page.tsx
"use client"; // Necesario para usar hooks en Next.js

import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

export default function Home() {
  // --- ESTADOS DEL JUEGO ---
  const [historia, setHistoria] = useState("");
  const [sospechosos, setSospechosos] = useState<string[]>([]);
  const [culpableSecreto, setCulpableSecreto] = useState("");
  const [preguntasRestantes, setPreguntasRestantes] = useState(5); // 5 intentos
  const [historial, setHistorial] = useState<{ pregunta: string; respuesta: string }[]>([]);
  const [preguntaActual, setPreguntaActual] = useState("");
  const [acusacionRealizada, setAcusacionRealizada] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState("");
  const [cargando, setCargando] = useState(false);

  // Nada más cargar la página, obtenemos el enigma del día
  useEffect(() => {
    cargarEnigmaDelDia();
  }, []);

  const cargarEnigmaDelDia = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0]; // "2026-04-27"

    // 1. Intentar obtener el enigma de hoy desde Supabase
    const { data: enigmaExistente, error } = await supabase
      .from('enigmas_diarios')
      .select('*')
      .eq('fecha', hoy)
      .single();

    if (enigmaExistente) {
      // Si ya existe, lo cargamos directamente
      setHistoria(enigmaExistente.historia);
      setSospechosos(enigmaExistente.sospechosos);
      setCulpableSecreto(enigmaExistente.culpable_secreto);
      setCargando(false);
    } else {
      // Si no existe, lo generamos llamando a nuestra API
      try {
        const res = await fetch('/api/generar-enigma');
        const nuevoEnigma = await res.json();
        if (nuevoEnigma.error) {
          // Si el backend devolvió un error, lo mostramos
          setResultadoFinal("No hay enigma disponible hoy. Vuelve más tarde.");
        } else {
          setHistoria(nuevoEnigma.historia);
          setSospechosos(nuevoEnigma.sospechosos);
          setCulpableSecreto(nuevoEnigma.culpable_secreto);
        }
      } catch (err) {
        console.error(err);
        setResultadoFinal("Error al conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    }
  };

  // Manejar el envío de una pregunta
  const manejarPregunta = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita recargar la página
    if (preguntasRestantes === 0 || !preguntaActual.trim()) return;

    setCargando(true);
    const pregunta = preguntaActual;
    setPreguntaActual(""); // Limpiar el input

    try {
      const res = await fetch('/api/interrogar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historia,
          sospechosos,
          culpableSecreto,
          pregunta,
        }),
      });
      const data = await res.json();
      const respuesta = data.respuesta || "Error";

      // Añadir al historial
      setHistorial([...historial, { pregunta, respuesta }]);
      // Restar una pregunta
      setPreguntasRestantes(preguntasRestantes - 1);
    } catch (error) {
      console.error(error);
      setHistorial([...historial, { pregunta, respuesta: "Error de conexión" }]);
      setPreguntasRestantes(preguntasRestantes - 1);
    } finally {
      setCargando(false);
    }
  };

  // Manejar la acusación final
  const manejarAcusacion = (acusado: string) => {
    if (acusado === culpableSecreto) {
      setResultadoFinal(`🎉 ¡Increíble, detective! ¡Has atrapado a ${culpableSecreto}!`);
    } else {
      setResultadoFinal(`😔 No era ${acusado}. El verdadero culpable era ${culpableSecreto}. ¡Mejor suerte mañana!`);
    }
    setAcusacionRealizada(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">
        {/* Título */}
        <h1 className="text-4xl font-bold text-center mb-8 text-yellow-500">
          🕵️ El Enigma del Día
        </h1>

        {/* Estado de carga */}
        {cargando && <p className="text-center text-lg">Cargando el misterio del día...</p>}

        {/* Si ya tenemos historia, mostramos el juego */}
        {!cargando && historia && (
          <>
            {/* Tarjeta de la historia */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 border border-gray-700">
              <p className="text-lg leading-relaxed">{historia}</p>
            </div>

            {/* Botones de sospechosos (para acusar) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {sospechosos.map((sospechoso) => (
                <button
                  key={sospechoso}
                  onClick={() => manejarAcusacion(sospechoso)}
                  // El botón solo está activo si ya gastamos todas las preguntas y no hemos acusado aún
                  disabled={acusacionRealizada || preguntasRestantes > 0}
                  className="bg-red-800 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition text-sm"
                >
                  Acusar a {sospechoso}
                </button>
              ))}
            </div>

            {/* Sección de preguntas (solo si no hemos acusado) */}
            {!acusacionRealizada && (
              <>
                <form onSubmit={manejarPregunta} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={preguntaActual}
                    onChange={(e) => setPreguntaActual(e.target.value)}
                    placeholder="Haz tu pregunta..."
                    disabled={preguntasRestantes === 0}
                    className="flex-1 p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={preguntasRestantes === 0 || cargando}
                    className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    Interrogar
                  </button>
                </form>
                <p className="text-right text-gray-400 mb-6">
                  Preguntas restantes: {preguntasRestantes} / 5
                </p>
              </>
            )}

            {/* Historial de preguntas realizadas */}
            {historial.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8">
                <h2 className="text-xl font-semibold mb-3">📝 Historial de Interrogatorios</h2>
                <ul className="space-y-2">
                  {historial.map((item, index) => (
                    <li key={index} className="border-b border-gray-700 pb-2">
                      <p className="text-gray-300"><span className="font-bold text-yellow-500">Pregunta:</span> {item.pregunta}</p>
                      <p className="text-blue-400"><span className="font-bold text-yellow-500">Respuesta:</span> {item.respuesta}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mensaje de resultado final (tras acusación) */}
            {acusacionRealizada && (
              <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-yellow-500 text-center">
                <p className="text-2xl font-bold">{resultadoFinal}</p>
                <p className="mt-4 text-gray-400">¡Vuelve mañana para un nuevo misterio!</p>
              </div>
            )}
          </>
        )}

        {/* Si no hay historia y no está cargando, mostramos un mensaje de error */}
        {!cargando && !historia && resultadoFinal && (
          <div className="text-center p-6 bg-gray-800 rounded-lg border border-red-500">
            <p className="text-xl">{resultadoFinal}</p>
          </div>
        )}
      </div>
    </main>
  );
}