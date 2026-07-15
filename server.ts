import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";
import * as xlsx from "xlsx";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

// Server-side Supabase client — uses the service key when available (bypasses RLS
// to read other users' push_subscriptions rows), falling back to the anon key.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

// Shared Gemini lazy initialization function
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("La clave GEMINI_API_KEY no está configurada. Por favor, añádela en la pestaña Configuración > Secrets en AI Studio.");
    }
    genAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

// Exercise Library — in-memory cache (populated on first request, never persisted)
const EXERCISE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
let exerciseLibraryCache: any[] | null = null;

// Multer and Excel utility helper functions
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

function sanitizeJsonText(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(^|\s)\/\/.*$/gm, "$1") // line comments
    .replace(/'([^']*)'/g, '"$1"') // single-quoted strings → double-quoted
    .replace(/,(\s*[}\]])/g, "$1"); // trailing commas before } or ]
}

function parseExcelToTabular(buffer: Buffer): string {
  try {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let resultText = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      if (rows.length === 0) return;

      resultText += `\nHoja: ${sheetName}\n`;
      
      rows.forEach((row) => {
        if (!Array.isArray(row)) return;
        const formattedRow = row.map(val => val !== undefined && val !== null ? String(val).trim() : "").join(" | ");
        if (formattedRow.replace(/\|/g, "").trim().length > 0) {
          resultText += `| ${formattedRow} |\n`;
        }
      });
    });

    return resultText;
  } catch (error) {
    console.error("Error parsing excel spreadsheet:", error);
    return "";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Generate Plan Endpoint
  app.post("/api/generate-plan", async (req, res) => {
    try {
      const {
        name,
        age,
        weight,
        height,
        gender,
        goals = [],
        objective,
        medicalConditions = [],
        experience,
        daysPerWeek,
        sessionDuration,
        cardioEquipment = [],
        strengthEquipment = [],
        exercisesToAvoid = "",
        injuriesOrLimitations = "",
        specificGoal = "",
        muscle_focus = [] as string[],
        trainingLocation = "gym",
        locationByDay = {} as Record<string, string>,
        gymCardioEquipment = [] as string[],
        gymStrengthEquipment = [] as string[],
        homeEquipment = [] as string[]
      } = req.body;

      // Basic validation
      if (!name || !age || !weight || !height) {
        return res.status(400).json({ error: "Faltan datos requeridos (nombre, edad, peso y altura son necesarios)." });
      }

      const wNum = parseFloat(weight);
      const hNum = parseFloat(height);
      const imc = (wNum / ((hNum / 100) * (hNum / 100))).toFixed(1);

      const userGoalsStr = (goals && goals.length > 0) ? goals.join(", ") : (objective || "No especificado");

      const prompt = `Eres un fisiólogo del ejercicio y entrenador personal experto. 
Diseñá un plan de entrenamiento personalizado y completo basado en este perfil:

PERFIL DEL USUARIO:
- Nombre: ${name}
- Edad: ${age} años
- Peso: ${weight} kg
- Altura: ${height} cm
- Género: ${gender}
- IMC: ${imc}
- Objetivos principales: ${userGoalsStr}
- Condiciones médicas: ${medicalConditions.length > 0 ? medicalConditions.join(", ") : "Ninguna"}
- Nivel de experiencia: ${experience}
- Días disponibles por semana: ${daysPerWeek}
- Duración de cada sesión: ${sessionDuration}
- Equipamiento cardio disponible: ${cardioEquipment.length > 0 ? cardioEquipment.join(", ") : "Ninguno/No tiene"}
- Equipamiento de fuerza disponible: ${strengthEquipment.length > 0 ? strengthEquipment.join(", ") : "Ninguno"}
- Ejercicios a evitar: ${exercisesToAvoid || "Ninguno"}
- Lesiones o limitaciones: ${injuriesOrLimitations || "Ninguna"}
${specificGoal ? `- Objetivo o evento específico: "${specificGoal}". Considerá esto al diseñar el plan — si menciona un deporte, incluí trabajo complementario relevante (movilidad, potencia, resistencia específica); si menciona una fecha límite, tené en cuenta el tiempo disponible para progresar.` : ""}
${muscle_focus.length > 0 && !muscle_focus.includes("⚖️ Full body") ? `- Zonas musculares a priorizar: ${muscle_focus.join(", ")}. Aumentá el volumen de trabajo en estos grupos.` : ""}
${trainingLocation === "both"
  ? `- Ubicación de entrenamiento: AMBOS lugares según este calendario semanal: ${JSON.stringify(locationByDay)}
- Cardio en GYM: ${gymCardioEquipment.length > 0 ? gymCardioEquipment.join(", ") : "Ninguno"}
- Fuerza en GYM: ${gymStrengthEquipment.length > 0 ? gymStrengthEquipment.join(", ") : "Ninguno"}
- Equipamiento en CASA: ${homeEquipment.length > 0 ? homeEquipment.join(", ") : "Peso corporal únicamente"}`
  : trainingLocation === "home"
  ? `- Ubicación de entrenamiento: CASA — todos los ejercicios deben ser realizables en casa.
- Equipamiento en casa: ${[...cardioEquipment, ...strengthEquipment].join(", ") || "Peso corporal únicamente"}`
  : `- Ubicación de entrenamiento: GIMNASIO`}

INSTRUCCIONES PARA GENERAR EL PLAN:

0. COMBINACIÓN DE OBJETIVOS (CRÍTICO):
   Si el usuario tiene múltiples objetivos seleccionados (ej. "Ganar músculo (hipertrofia)" + "Perder grasa corporal"), diseña un programa híbrido inteligente. Por ejemplo: prioriza hipertrofia/fuerza en las series de musculación pero incorpora pautas metabólicas, de baja interferencia, o ráfagas cortas de cardio zona 2 o finishers HIIT sutiles al final para apoyar el gasto calórico sin sacrificar la síntesis de proteínas.

1. Elegí la DIVISIÓN más adecuada según los días disponibles:
   - 2 días: Full Body A/B
   - 3 días: Push/Pull/Legs O Full Body A/B/C
   - 4 días: Upper/Lower (Upper A, Lower A, Upper B, Lower B)
   - 5 días: Push/Pull/Legs/Upper/Lower
   - 6 días: Push/Pull/Legs x2

2. Para CADA DÍA de entrenamiento, generá:
   - 3 ejercicios de calentamiento específicos
   - 3 a 4 bloques de ejercicios (Fuerza o Hipertrofia)
   - Cada bloque puede ser individual o superserie (máximo 3 ejercicios en superserie)
   - 3 ejercicios de enfriamiento/estiramiento

3. Para CADA EJERCICIO incluí:
   - Nombre claro y específico
   - Series y repeticiones (o tiempo/calorías para cardio)
   - Peso recomendado para el nivel del usuario (rango como "40-55 kg" o "2×10-15 kg" o "Peso corporal")
   - Tiempo de descanso en segundos
   - Músculos trabajados (máximo 4)
   - Tip de técnica (1-2 oraciones)
   - Error común a evitar (1 oración)
   - URL de YouTube Shorts relevante para ese ejercicio en formato https://www.youtube.com/shorts/XXXXXXXXX (usa slugs válidos o genéricos o representativos de fitness reales como z8g1u2v3, o inventa slugs que sigan ese formato exacto de shorts de youtube)

4. CONSIDERA el equipamiento disponible — solo usá ejercicios con el equipo que tiene.

5. CONSIDERA las condiciones médicas:
   - Colesterol LDL alto: incluir cardio de zona 2-3 y zona 4 en cada sesión
   - Problemas de rodilla: evitar ejercicios de alto impacto, priorizar trabajo excéntrico
   - Problemas de espalda: evitar flexión lumbar bajo carga, priorizar core estabilizador
   - Presión alta: evitar Valsalva, descansos más largos

6. CONSIDERA el nivel:
   - Principiante: ejercicios básicos, más descanso, menos volumen, técnica primero
   - Intermedio: ejercicios compuestos + aislamiento, superseries, progresión semanal
   - Avanzado: técnicas avanzadas (drop sets, rest-pause), mayor volumen e intensidad

7. UBICACIÓN DE ENTRENAMIENTO:
${trainingLocation === "both"
  ? `   El usuario entrena en AMBOS lugares según el calendario indicado arriba.
   - Para días asignados a GYM: usá ÚNICAMENTE el equipamiento de gimnasio listado.
   - Para días asignados a CASA: usá ÚNICAMENTE el equipamiento de casa listado.
   - Los días que NO aparecen en el calendario son DESCANSO obligatorio — no generes entrenamientos para ellos.
   - El campo "location" de cada día en el JSON debe ser "gym" o "home" según corresponda.`
  : trainingLocation === "home"
  ? `   El usuario entrena SOLO en casa. Todos los ejercicios deben ser realizables con el equipamiento de casa listado.
   El campo "location" de cada día debe ser "home".`
  : `   El usuario entrena en el GIMNASIO. El campo "location" de cada día debe ser "gym".`}

8. Incluí una GUÍA DE PROGRESIÓN específica para este usuario.

Deberás responder EN IDIOMA ESPAÑOL.
RESPONDÉ ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional de introducción ni de cierre:

{
  "plan_name": "nombre descriptivo del plan",
  "division": "nombre de la división elegida",
  "days_per_week": ${daysPerWeek},
  "session_duration": "${sessionDuration}",
  "progression_guide": "texto de 3-4 oraciones sobre cómo progresar",
  "cardio_note": "texto sobre el cardio integrado y su efecto en los objetivos del usuario",
  "medical_note": "texto sobre consideraciones médicas si las hay, o null",
  "weekly_schedule": {
    "monday": "Upper A" o "Rest" o "Full Body A" etc,
    "tuesday": "...",
    "wednesday": "...",
    "thursday": "...",
    "friday": "...",
    "saturday": "...",
    "sunday": "..."
  },
  "days": [
    {
      "id": "day_1",
      "name": "Upper A",
      "day_of_week": "Lunes",
      "focus": "Pecho · Espalda horizontal · Bíceps",
      "duration": "~65 min",
      "location": "gym" o "home",
      "warmup": [
        {
          "name": "nombre del ejercicio de calentamiento",
          "sets_reps": "2×10",
          "note": "objetivo del calentamiento"
        }
      ],
      "blocks": [
        {
          "type": "strength" o "hypertrophy",
          "is_superset": true o false,
          "label": "Fuerza" o "Hipertrofia",
          "title": "Ejercicio principal o descripción de la superserie",
          "exercises": [
            {
              "name": "nombre completo del ejercicio",
              "muscles": ["Músculo 1", "Músculo 2"],
              "sets": 3,
              "reps": "8-10" o "30s" o "12",
              "weight": "40-55 kg" o "S/D" o "Peso corporal",
              "rest_seconds": 90,
              "technique_tip": "tip de técnica",
              "common_error": "error común",
              "youtube_url": "https://www.youtube.com/shorts/3ZMy8VId9wQ"
            }
          ]
        }
      ],
      "cooldown": [
        {
          "name": "nombre del estiramiento o enfriamiento",
          "duration": "2×30\"" o "1×60\""
        }
      ]
    }
  ]
}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 1.0,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      // Parse JSON from text
      const parsedPlan = JSON.parse(responseText.trim());
      return res.json(parsedPlan);
    } catch (error: any) {
      console.error("Error generating training plan:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor al generar el plan de entrenamiento." });
    }
  });

  // Generate Nutrition Guide Endpoint
  app.post("/api/generate-nutrition", async (req, res) => {
    try {
      const {
        name,
        age,
        weight,
        height,
        gender,
        goals = [],
        objective,
        medicalConditions = [],
        daysPerWeek,
      } = req.body;

      const nombre = name || "Atleta";
      const edad = age || "No especificada";
      const peso = weight || "No especificado";
      const altura = height || "No especificada";
      const genero = gender || "No especificado";
      const objetivoStr = (goals && goals.length > 0) ? goals.join(", ") : (objective || "No especificado");
      const diasSemana = daysPerWeek || "No especificado";
      const condiciones = medicalConditions.length > 0 ? medicalConditions.join(", ") : "Ninguna";

      const prompt = `Respondé siempre en español rioplatense argentino. Usá vocabulario local: "palta" (no aguacate), "leche descremada" (no desnatada), "maní" (no cacahuetes), "choclo" (no maíz), "arvejas" (no guisantes), "morrón" (no pimiento), "ananá" (no piña), "durazno" (no melocotón), "zapallo" (no calabaza), "batata" (no boniato o camote). Tutear siempre al usuario.

Eres un nutricionista deportivo. Tu tarea es generar una guía nutricional personalizada, precisa y basada en evidencia científica. No inventes valores — usá las fórmulas indicadas.

PERFIL DEL USUARIO:
- Nombre: ${nombre}
- Edad: ${edad} años
- Peso: ${peso} kg
- Altura: ${altura} cm
- Género: ${genero}
- Objetivo: ${objetivoStr}
- Días de entrenamiento por semana: ${diasSemana}
- Condiciones médicas: ${condiciones}

PASO 1 — CALCULAR TMB con fórmula Mifflin-St Jeor:
- Hombre: TMB = (10 × peso) + (6.25 × altura) - (5 × edad) + 5
- Mujer: TMB = (10 × peso) + (6.25 × altura) - (5 × edad) - 161
- Otro/no especificado: usá el promedio de ambas fórmulas

PASO 2 — CALCULAR TDEE multiplicando TMB por factor de actividad:
- 1-2 días/semana: × 1.375
- 3-4 días/semana: × 1.55
- 5-6 días/semana: × 1.725
- 7 días/semana: × 1.9

PASO 3 — AJUSTAR según objetivo:
- Hipertrofia / ganar músculo: TDEE + 250 kcal
- Perder grasa: TDEE - 400 kcal
- Fuerza / rendimiento: TDEE + 100 kcal
- Mantenimiento: TDEE sin cambio

PASO 4 — CALCULAR MACROS según evidencia:
- Proteína:
  - Hipertrofia: 2.0g × peso corporal (kg)
  - Pérdida de grasa: 2.2g × peso corporal (kg)
  - Fuerza/mantenimiento: 1.8g × peso corporal (kg)
- Grasas: mínimo 1g × peso corporal (kg), no bajar de este umbral
- Carbohidratos: calorías restantes después de proteína y grasas ÷ 4

Para cada momento del día en "distribucion", estimá los macros aproximados (proteina_g, carbohidratos_g, grasas_g, calorias) coherentes con el total diario — la suma de todos los momentos debe ser consistente con los macros totales calculados. Distribuí según criterio nutricional: más carbohidratos en pre-entrenamiento y post-entrenamiento, más proteína en almuerzo y cena, grasas distribuidas principalmente en desayuno y almuerzo.

Para cada momento del día en "distribucion", incluí un campo "razon" con una explicación breve (1-2 oraciones) de por qué ese plato está estructurado así para el objetivo del usuario — en términos nutricionales concretos, no genéricos. Ejemplo: "Los carbohidratos de rápida absorción proveen energía inmediata para el entrenamiento, mientras que la proteína previene el catabolismo muscular durante el esfuerzo."

REGLAS ESTRICTAS:
- Si falta peso, altura, edad o género: incluí una nota en datos_faltantes indicando qué falta y que los valores son estimados
- Si el usuario tiene condiciones médicas relevantes (diabetes, hipertensión, enfermedad renal, etc.): incluí una advertencia específica en las notas indicando que debe consultar un médico o nutricionista antes de seguir esta guía
- No sugieras suplementos que interactúen con condiciones médicas declaradas
- Redondea los números a valores prácticos (múltiplos de 5 para calorías, enteros para macros)

Devolvé ÚNICAMENTE un JSON válido RFC 8259. Sin comentarios, sin trailing commas, sin comillas simples, sin texto fuera del JSON. Solo el objeto JSON puro.
{
  calorias_diarias: number,
  tmb_calculada: number,
  tdee_calculado: number,
  objetivo: string,
  macros: { proteina_g: number, carbohidratos_g: number, grasas_g: number },
  distribucion: [ { momento: string, descripcion: string, ejemplos: string[], macros: { proteina_g: number, carbohidratos_g: number, grasas_g: number, calorias: number }, razon: string } ],
  suplementos: [ { nombre: string, dosis: string, motivo: string } ],
  datos_faltantes: string[],
  notas: string[],
  disclaimer: string
}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      const cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      console.error("RAW GEMINI RESPONSE:", cleaned);

      try {
        const guide = JSON.parse(sanitizeJsonText(cleaned.trim()));
        return res.json(guide);
      } catch (e) {
        console.error("JSON PARSE ERROR:", e);
        console.error("CLEANED TEXT:", cleaned);
        return res.status(500).json({ error: "json_parse_error", message: String(e) });
      }
    } catch (error: any) {
      console.error("Error generating nutrition guide:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor al generar la guía nutricional." });
    }
  });

  // POST /api/parse-plan-document endpoint to read uploaded plans
  app.post("/api/parse-plan-document", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const profileStr = req.body.profile;

      if (!file) {
        return res.status(400).json({
          success: false,
          parsed_plan: null,
          inconsistency_warning: null,
          error: "No se subió ningún archivo. Por favor selecciona un documento."
        });
      }

      let profile: any = {};
      if (profileStr) {
        try {
          profile = JSON.parse(profileStr);
        } catch (e) {
          console.error("Error parsing profile in request:", e);
        }
      }

      const name = profile.name || "Atleta";
      const age = profile.age || "No especificada";
      const weight = profile.weight || "No especificado";
      const height = profile.height || "No especificada";
      const objectiveText = (profile.goals && profile.goals.length > 0) ? profile.goals.join(", ") : (profile.objective || "No especificado");
      const experience = profile.experience || "No especificado";
      const medicalConditions = profile.medicalConditions?.length > 0 ? profile.medicalConditions.join(", ") : "Ninguna";
      const equipamiento = `Cardio: ${profile.cardioEquipment?.length > 0 ? profile.cardioEquipment.join(", ") : "Ninguno"} / Fuerza: ${profile.strengthEquipment?.length > 0 ? profile.strengthEquipment.join(", ") : "Ninguno"}`;

      const originalName = file.originalname.toLowerCase();
      const isExcel = originalName.endsWith(".xlsx") || originalName.endsWith(".xls") || originalName.endsWith(".csv") || file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimetype === "application/vnd.ms-excel" || file.mimetype === "text/csv";

      let spreadsheetDataText = "";
      if (isExcel) {
        spreadsheetDataText = parseExcelToTabular(file.buffer);
        if (!spreadsheetDataText) {
          return res.status(400).json({
            success: false,
            parsed_plan: null,
            inconsistency_warning: null,
            error: "No pudimos leer el archivo Excel. Probá con otro formato o saca una foto más clara."
          });
        }
      }

      const docTextContext = isExcel 
        ? `A continuación se encuentra el contenido de la tabla Excel/CSV extraído:\n${spreadsheetDataText}` 
        : `El plan está incluido como un documento adjunto (PDF o imagen). Por favor analízalo directamente.`;

      const instructionsPrompt = `Eres un experto en digitalizar planes de entrenamiento de gimnasio. Te voy a dar un documento (PDF, foto o tabla de Excel) que contiene un plan de entrenamiento real, probablemente armado por un profesor o gimnasio. Tu tarea es extraer TODA la información y estructurarla en el formato JSON que te indico abajo.

PERFIL DEL USUARIO (para darte contexto de sus necesidades, NO para inventar ejercicios que no vengan en el documento):
- Nombre: ${name}
- Edad: ${age} años, Peso: ${weight}kg, Altura: ${height}cm
- Objetivo: ${objectiveText}
- Condiciones médicas: ${medicalConditions}
- Nivel de experiencia: ${experience}
- Equipamiento disponible: ${equipamiento}

DOCUMENTO DE ENTRENAMIENTO ANALIZADO:
${docTextContext}

INSTRUCCIONES CRÍTICAS:
1. Extraé ÚNICAMENTE los ejercicios, series, repeticiones, pesos y días que aparecen en el documento. NO inventes ejercicios que no estén en el documento original.
2. Si el documento no especifica algún dato (ej: no dice el descanso entre series), inferí un valor razonable según el tipo de ejercicio y anotalo, pero priorizá siempre lo que el documento dice explícitamente.
3. Si hay un ejercicio con texto ambiguo, abreviado o manuscrito poco claro, haz tu mejor interpretación y marca ese ejercicio como "needs_review": true en el JSON.
4. Identificá la estructura de días tal como está en el documento (no la reorganices a Push/Pull/Legs si el documento ya tiene su propia división de días/grupos).
5. Para cada ejercicio, agrega de tu parte la lista de músculos trabajados ("muscles" como string[]), un tip de técnica breve en "technique_tip", y si puedes identificar el ejercicio con certeza, un enlace a YouTube Shorts de muestra relevante en "youtube_url" (si no estás seguro o no hay, pon null).
6. Después de extraer todo el plan, compáralo con el perfil del usuario y genera un campo "inconsistency_warning" si detectas alguna inconsistencia que valga la pena avisarle al usuario. Ejemplos:
   - El usuario tiene colesterol alto pero el plan no incluye nada de cardio.
   - El usuario tiene problemas de rodilla o tobillo pero el plan incluye ejercicios de alto impacto sin variantes.
   - Para ejecutar el plan se requiere equipo (ej: máquinas específicas) que el usuario NO marcó disponible en su equipamiento.
   Si no hay ninguna inconsistencia relevante, el campo "inconsistency_warning" debe ser null.

Tu respuesta debe de ser un JSON válido, sin texto adicional, sin markdown, sin backticks, con esta estructura exacta:

{
  "plan_name": "nombre descriptivo que detectes o inventes para este plan de entrenamiento",
  "division": "nombre de la división detectada (ej: Push/Pull/Legs, A/B Full Body, etc.)",
  "days_per_week": número de días de entrenamiento detectados,
  "session_duration": "estimación de la duración de cada sesión (ej: ~60 min)",
  "source": "uploaded_document",
  "inconsistency_warning": "texto de la inconsistencia en español" o null,
  "weekly_schedule": {
    "monday": "nombre del día o Rest",
    "tuesday": "...",
    "wednesday": "...",
    "thursday": "...",
    "friday": "...",
    "saturday": "...",
    "sunday": "..."
  },
  "days": [
    {
      "id": "day_1",
      "name": "nombre del día tal como aparece en el documento o inferido (ej: Día 1 - Pecho)",
      "day_of_week": "Lunes" o "Martes" o el día asignado,
      "focus": "músculos o foco del día",
      "duration": "estimación de duración",
      "warmup": [
        {
          "name": "ejercicio de calentamiento",
          "sets_reps": "series x reps o duración",
          "note": "breve nota"
        }
      ],
      "blocks": [
        {
          "type": "strength" o "hypertrophy",
          "is_superset": true o false,
          "label": "Fuerza" o "Hipertrofia" o "Superserie",
          "title": "nombre o descripción del bloque de ejercicios",
          "exercises": [
            {
              "name": "nombre del ejercicio EXACTO como viene en el documento",
              "muscles": ["músculo1", "músculo2"],
              "sets": número de series extraído del documento (ej: 4),
              "reps": "valor o rango de reps extraído (ej: \"10-12\" o \"8\")",
              "weight": "peso extraído del documento o \"S/D\" si no se especifica",
              "rest_seconds": número de segundos de descanso (inferido si no está explícito),
              "technique_tip": "tip corto de técnica",
              "common_error": "error común" o null,
              "youtube_url": "url de youtube" o null,
              "needs_review": true o false
            }
          ]
        }
      ],
      "cooldown": [
        {
          "name": "estiramiento o actividad de enfriamiento",
          "duration": "duración (ej: \"2×30\\\"\")"
        }
      ]
    }
  ]
}
`;

      const ai = getGeminiClient();

      let contentsPayload: any[];
      if (isExcel) {
        contentsPayload = [instructionsPrompt];
      } else {
        contentsPayload = [
          {
            inlineData: {
              mimeType: file.mimetype,
              data: file.buffer.toString("base64")
            }
          },
          instructionsPrompt
        ];
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se pudo digitalizar el documento.");
      }

      const parsedPlan = JSON.parse(responseText.trim());
      parsedPlan.source = "uploaded_document";

      return res.json({
        success: true,
        parsed_plan: parsedPlan,
        inconsistency_warning: parsedPlan.inconsistency_warning || null,
        error: null
      });

    } catch (error: any) {
      console.error("Error in parse-plan-document API:", error);
      let errorMsg = "No pudimos procesar el archivo. Por favor intenta de nuevo con un formato compatible.";
      if (error.message && error.message.includes("JSON")) {
        errorMsg = "Este documento no parece tener un plan de entrenamiento con una estructura reconocible. ¿Es el archivo correcto?";
      }
      return res.status(500).json({
        success: false,
        parsed_plan: null,
        inconsistency_warning: null,
        error: errorMsg
      });
    }
  });

  // Coach IA message endpoint
  app.post("/api/coach-message", async (req, res) => {
    try {
      const { message, plan, profile, nutritionGuide = null, chatHistory = [], exerciseHistory = {}, recentWorkoutLogs = [] } = req.body;

      if (!message || !plan || !profile) {
        return res.status(400).json({ error: "Faltan datos requeridos (message, plan o perfil)." });
      }

      const formattedHistory = chatHistory
        .map((h: any) => `${h.role === 'user' ? 'Usuario' : 'Coach'}: ${h.text}`)
        .join("\n");

      const sourceInstruction = plan.source === "uploaded_document" 
        ? "\nNOTA: Este plan fue subido por el usuario desde su gimnasio/entrenador original, no fue generado por IA. Tené esto en cuenta — si el usuario pregunta por qué se eligió cierto ejercicio, aclará que fue parte de su plan original, y enfócate en ayudar a optimizarlo o adaptarlo, no en justificar decisiones que no tomaste vos." 
        : "";

      const prompt = `Eres un coach personal y fisiólogo del ejercicio experto. Estás ayudando a ${profile.name || "Atleta"} a personalizar su plan de entrenamiento.

PERFIL DEL USUARIO:
- Nombre: ${profile.name || "Atleta"}
- Edad: ${profile.age || "No especificada"} años, Peso: ${profile.weight || "No especificado"}kg, Altura: ${profile.height || "No especificada"}cm
- Objetivos: ${profile.goals && profile.goals.length > 0 ? profile.goals.join(", ") : (profile.objective || "No especificado")}
- Nivel: ${profile.experience || "No especificado"}
- Condiciones médicas: ${profile.medicalConditions?.length > 0 ? profile.medicalConditions.join(", ") : "Ninguna"}
- Equipamiento disponible - Cardio: ${profile.cardioEquipment?.length > 0 ? profile.cardioEquipment.join(", ") : "Ninguno"} / Fuerza: ${profile.strengthEquipment?.length > 0 ? profile.strengthEquipment.join(", ") : "Ninguno"}
- Ubicación de entrenamiento: ${
  profile.trainingLocation === "both"
    ? `Ambos lugares. Calendario: ${JSON.stringify(profile.locationByDay || {})}. GYM cardio: ${profile.gymCardioEquipment?.join(", ") || "Ninguno"}, fuerza: ${profile.gymStrengthEquipment?.join(", ") || "Ninguno"}. CASA: ${profile.homeEquipment?.join(", ") || "Peso corporal únicamente"}`
    : profile.trainingLocation === "home" ? "En casa" : "En el gimnasio"
}

PLAN ACTUAL COMPLETO:
${JSON.stringify(plan, null, 2)}
${sourceInstruction}

GUÍA NUTRICIONAL ACTUAL DEL USUARIO: ${nutritionGuide ? JSON.stringify(nutritionGuide, null, 2) : "El usuario todavía no generó una guía nutricional."}
Podés responder preguntas sobre esta guía y sugerir modificaciones cuando el usuario lo pida (reemplazos de alimentos, exclusiones, ajustes de porciones). Si el usuario pide un cambio en su nutrición, devolvé nutrition_modified: true y updated_nutrition_guide con la guía completa modificada.

HISTORIAL DE CONVERSACIÓN RECIENTE:
${formattedHistory || "Ninguno"}

MENSAJE DEL USUARIO:
${message}

HISTORIAL RECIENTE DE CARGAS (últimas 2 semanas, máx 3 sesiones por ejercicio):
${Object.keys(exerciseHistory).length > 0
  ? Object.entries(exerciseHistory as Record<string, {date:string;weight:string}[]>)
      .map(([name, entries]) => `- ${name}: ${entries.map((e: {date:string;weight:string}) => `${e.date} → ${e.weight}`).join(" | ")}`)
      .join("\n")
  : "Sin registros de cargas aún."}

ÚLTIMOS ENTRENAMIENTOS REGISTRADOS (últimas 8 sesiones completadas desde la app):
${(recentWorkoutLogs as {date:string;dayName:string;durationMinutes:number;totalVolumeKg:number}[]).length > 0
  ? (recentWorkoutLogs as {date:string;dayName:string;durationMinutes:number;totalVolumeKg:number}[])
      .map((l) => `- ${l.date} | ${l.dayName} | ${l.durationMinutes} min | ${l.totalVolumeKg} kg volumen total`)
      .join("\n")
  : "Sin sesiones registradas aún."}
Si el usuario pregunta sobre su progreso, volumen de entrenamiento o consistencia (ej: "¿cómo vengo esta semana?", "¿cuánto volumen hice?", "¿qué tan seguido entreno?"), usá estos datos reales para responder con precisión en vez de generalidades. NO menciones estos datos si el usuario no preguntó nada relacionado con su historial o consistencia.

INSTRUCCIONES:
1. Analizá el pedido del usuario en el contexto de su plan actual y su perfil.
2. Si el usuario pide un cambio al plan (reemplazar ejercicio, agregar volumen, cambiar días, modificar series/reps, etc.):
   - Hacé los cambios en el JSON del plan y devuélvelo completo modificado en "updated_plan". Asegúrate de que todos los campos del JSON sigan perfectamente la estructura de FullTrainingPlan, conservando ejercicios que no se pidan cambiar.
   - Respondé explicando QUÉ cambiaste y POR QUÉ es una buena decisión.
   - Incluí el plan modificado en el campo "updated_plan" de tu respuesta.
3. Si el usuario hace una pregunta sobre entrenamiento, nutrición, técnica, etc.:
   - Respondé de forma clara y concisa (máximo 4 oraciones).
   - NO incluyas "updated_plan" si no hubo cambios al plan.
   - NO incluyas "updated_nutrition_guide" si no hubo cambios a la guía nutricional.
4. Mantén un tono motivador, directo y profesional. Como un buen coach personal.
5. Si el pedido es imposible dado el equipamiento disponible, explicalo y sugerí una alternativa viable.
6. Respondé SIEMPRE en español.
7. Si el usuario menciona que hoy no puede entrenar en su ubicación habitual (ej: "no puedo ir al gym", "estoy de viaje", "entreno en casa hoy"):
   - Identificá qué día del plan corresponde.
   - Generá una versión adaptada SOLO para ese día con ejercicios realizables con el equipamiento alternativo disponible.
   - Aclaralo explícitamente: "Para hoy te armé una versión adaptada. Tu plan regular sigue igual."
   - Este cambio es temporal — no modifiques el plan completo a menos que el usuario lo pida explícitamente.

8. Si detectás que el usuario lleva 2+ semanas con el mismo peso en un ejercicio sin progresión, podés mencionarlo SOLO SI el usuario preguntó algo relacionado a ese ejercicio, a su progreso general, o a qué peso usar. NO inicies el mensaje hablando de estancamiento sin que haya una pregunta relacionada primero.

RESPONDÉ con este JSON exacto, sin texto adicional:
{
  "coach_message": "tu respuesta en texto natural para el usuario",
  "plan_modified": true o false,
  "updated_plan": { ...plan completo modificado... } o null,
  "nutrition_modified": true o false,
  "updated_nutrition_guide": { ...guía nutricional completa modificada... } o null
}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se recibió respuesta del modelo Gemini.");
      }

      const parsedResponse = JSON.parse(responseText.trim());
      return res.json({
        coach_message: parsedResponse.coach_message || "¡Hola! ¿En qué puedo ayudarte hoy?",
        plan_modified: !!parsedResponse.plan_modified,
        updated_plan: parsedResponse.updated_plan || null,
        nutrition_modified: !!parsedResponse.nutrition_modified,
        updated_nutrition_guide: parsedResponse.updated_nutrition_guide || null
      });

    } catch (error: any) {
      console.error("Error in coach-message API:", error);
      return res.status(500).json({
        coach_message: "Hubo un error al procesar tu solicitud con el coach. Por favor, intenta de nuevo.",
        plan_modified: false,
        updated_plan: null,
        nutrition_modified: false,
        updated_nutrition_guide: null
      });
    }
  });

  // Exercise Library endpoint
  app.get("/api/exercise-library", async (req, res) => {
    try {
      if (!exerciseLibraryCache) {
        const response = await fetch(EXERCISE_DB_URL);
        if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`);
        const raw: any[] = await response.json();
        exerciseLibraryCache = raw.map((ex) => ({
          ...ex,
          images: (ex.images ?? []).map((img: string) => `${EXERCISE_IMAGE_BASE}${img}`),
        }));
      }

      let filtered = exerciseLibraryCache;

      const { search, category, level, equipment, page = "1", limit = "20" } = req.query;

      if (typeof search === "string" && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(q));
      }
      if (typeof category === "string" && category) {
        filtered = filtered.filter((ex) => ex.category === category);
      }
      if (typeof level === "string" && level) {
        filtered = filtered.filter((ex) => ex.level === level);
      }
      if (typeof equipment === "string" && equipment) {
        filtered = filtered.filter((ex) => ex.equipment === equipment);
      }

      const total = filtered.length;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
      const start = (pageNum - 1) * limitNum;

      return res.json({
        exercises: filtered.slice(start, start + limitNum),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (error: any) {
      console.error("Error in /api/exercise-library:", error);
      return res.status(500).json({ error: error.message || "Error fetching exercise library" });
    }
  });

  // Send Web Push Notification Endpoint
  app.post("/api/send-push-notification", async (req, res) => {
    try {
      const { userId, title, body, url } = req.body;

      if (!userId || !title || !body) {
        return res.status(400).json({ error: "Faltan datos requeridos (userId, title, body)." });
      }

      const { data: subscriptions, error } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (error) throw error;

      if (!subscriptions || subscriptions.length === 0) {
        return res.json({ sent: 0, total: 0, message: "El usuario no tiene suscripciones push activas." });
      }

      const payload = JSON.stringify({ title, body, url: url || "/" });
      let sent = 0;

      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent++;
          } catch (err: any) {
            if (err.statusCode === 410) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              console.error("Error sending push notification to endpoint:", sub.endpoint, err);
            }
          }
        })
      );

      return res.json({ sent, total: subscriptions.length });
    } catch (error: any) {
      console.error("Error in /api/send-push-notification:", error);
      return res.status(500).json({ error: error.message || "Error al enviar la notificación push." });
    }
  });

  // Vite Integration for Assets and Dev Server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
