import { UserProfile, FullTrainingPlan, DayDescriptions } from "../types";
import { saveUserProgress } from "./db";

const WEEKLY_SCHEDULE_KEY_BY_ES: Record<string, keyof FullTrainingPlan["weekly_schedule"]> = {
  lunes: "monday",
  martes: "tuesday",
  "miércoles": "wednesday",
  jueves: "thursday",
  viernes: "friday",
  "sábado": "saturday",
  domingo: "sunday",
};

function toDateStr(date: Date): string {
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
}

function weekdayKeyEs(date: Date): string {
  return date.toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase();
}

/**
 * A day counts as a training day if day_descriptions says so; falls back to
 * plan.weekly_schedule (same "Rest"/"descanso" convention used elsewhere in the app)
 * when day_descriptions isn't available for that weekday.
 */
function isTrainingDay(
  date: Date,
  dayDescriptions: DayDescriptions | undefined,
  plan: FullTrainingPlan | undefined
): boolean {
  const key = weekdayKeyEs(date);
  const desc = dayDescriptions?.[key];
  if (desc) return desc.type !== "descanso" && desc.type !== "recuperacion";

  const scheduleKey = WEEKLY_SCHEDULE_KEY_BY_ES[key];
  const val = (scheduleKey && plan?.weekly_schedule?.[scheduleKey]) || "";
  if (!val) return false;
  const lower = val.toLowerCase();
  return !(lower.includes("descanso") || lower === "rest");
}

/**
 * Calcula la racha actual y la más larga a partir de los días de entrenamiento
 * (según day_descriptions, con fallback a plan.weekly_schedule) y las fechas
 * completadas. Los días de descanso/recuperación se saltean — no rompen ni suman.
 */
export function calculateStreak(
  dayDescriptions: DayDescriptions | undefined,
  completedDays: string[],
  plan?: FullTrainingPlan
): { current_streak: number; longest_streak: number } {
  const completedSet = new Set(completedDays);
  const todayStr = toDateStr(new Date());

  // --- Racha actual: caminar hacia atrás desde hoy ---
  let current = 0;
  const cursor = new Date();
  for (let i = 0; i < 730; i++) {
    const dateStr = toDateStr(cursor);
    if (isTrainingDay(cursor, dayDescriptions, plan)) {
      if (completedSet.has(dateStr)) {
        current++;
      } else if (dateStr !== todayStr) {
        // Un día de entrenamiento pasado sin completar → la racha se rompe acá.
        break;
      }
      // Si es hoy y todavía no se completó, no rompe la racha — el día sigue en curso.
    }
    // Días de descanso/recuperación: se saltean, no afectan la racha.
    cursor.setDate(cursor.getDate() - 1);
  }

  // --- Racha más larga: recorrer cronológicamente desde el primer día completado ---
  let longest = current;
  if (completedDays.length > 0) {
    const sorted = [...completedDays].sort();
    const start = new Date(`${sorted[0]}T00:00:00`);
    const end = new Date();
    let run = 0;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!isTrainingDay(d, dayDescriptions, plan)) continue;
      const dateStr = toDateStr(d);
      if (completedSet.has(dateStr)) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
  }

  return { current_streak: current, longest_streak: longest };
}

/**
 * Marca `date` como completada, recalcula la racha, guarda en Supabase y
 * devuelve el perfil actualizado (para reflejarlo en el estado local).
 */
export async function markDayCompleted(
  userId: string,
  date: string,
  profile: UserProfile,
  plan: FullTrainingPlan
): Promise<UserProfile> {
  const completedDays = profile.completed_days ?? [];
  const nextCompletedDays = completedDays.includes(date)
    ? completedDays
    : [...completedDays, date];

  const { current_streak, longest_streak } = calculateStreak(
    profile.day_descriptions,
    nextCompletedDays,
    plan
  );

  const finalLongestStreak = Math.max(longest_streak, profile.longest_streak ?? 0);
  const updatedProfile: UserProfile = {
    ...profile,
    completed_days: nextCompletedDays,
    current_streak,
    longest_streak: finalLongestStreak,
  };

  await saveUserProgress(userId, {
    completed_days: nextCompletedDays,
    current_streak,
    longest_streak: finalLongestStreak,
  });
  return updatedProfile;
}
