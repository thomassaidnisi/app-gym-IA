import { supabase } from "./supabase";
import { UserProfile, FullTrainingPlan, WorkoutLog, NutritionGuide } from "../types";

/** Solo se incluyen en el upsert las claves presentes en `data` — así un caller parcial
 * (ej. subir solo el avatar) nunca pisa con null las columnas que no está tocando. */
function logIfError(label: string, result: { error: any }) {
  if (result.error) console.error(`${label} error:`, result.error);
  return result;
}

export async function saveProfile(
  userId: string,
  data: {
    name?: string;
    apellido?: string;
    fecha_nacimiento?: string;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    avatar_url?: string;
  }
) {
  const payload: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
  if (data.name !== undefined) payload.nombre = data.name;
  if (data.apellido !== undefined) payload.apellido = data.apellido;
  if (data.fecha_nacimiento !== undefined) payload.fecha_nacimiento = data.fecha_nacimiento;
  if (data.age !== undefined) payload.edad = data.age;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.height !== undefined) payload.height = data.height;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
  const result = await supabase.from("profiles").upsert(payload);
  return logIfError("saveProfile", result);
}

export async function saveOnboardingData(
  userId: string,
  data: {
    goals?: string[];
    objective?: string;
    muscle_focus?: string[];
    experience?: string;
    daysPerWeek?: number;
    medicalConditions?: string[];
    sessionDuration?: string;
    cardioEquipment?: string[];
    strengthEquipment?: string[];
    exercisesToAvoid?: string;
    injuriesOrLimitations?: string;
    specificGoal?: string;
    trainingLocation?: string;
    locationByDay?: UserProfile["locationByDay"];
    homeEquipment?: string[];
    gymCardioEquipment?: string[];
    gymStrengthEquipment?: string[];
    other_activities?: UserProfile["other_activities"];
    preferred_schedule?: string;
    preferred_days?: string[];
  }
) {
  const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (data.goals !== undefined) payload.objetivo = data.goals.join(",");
  if (data.objective !== undefined) payload.objective = data.objective;
  if (data.muscle_focus !== undefined) payload.muscle_focus = data.muscle_focus;
  if (data.experience !== undefined) payload.nivel = data.experience;
  if (data.daysPerWeek !== undefined) payload.dias_semana = data.daysPerWeek;
  if (data.medicalConditions !== undefined) payload.condiciones = data.medicalConditions.join(",");
  if (data.sessionDuration !== undefined) payload.session_duration = data.sessionDuration;
  if (data.cardioEquipment !== undefined) payload.cardio_equipment = data.cardioEquipment;
  if (data.strengthEquipment !== undefined) payload.strength_equipment = data.strengthEquipment;
  if (data.exercisesToAvoid !== undefined) payload.exercises_to_avoid = data.exercisesToAvoid;
  if (data.injuriesOrLimitations !== undefined) payload.injuries = data.injuriesOrLimitations;
  if (data.specificGoal !== undefined) payload.specific_goal = data.specificGoal;
  if (data.trainingLocation !== undefined) payload.training_location = data.trainingLocation;
  if (data.locationByDay !== undefined) payload.location_by_day = data.locationByDay;
  if (data.homeEquipment !== undefined) payload.home_equipment = data.homeEquipment;
  if (data.gymCardioEquipment !== undefined) payload.gym_cardio_equipment = data.gymCardioEquipment;
  if (data.gymStrengthEquipment !== undefined) payload.gym_strength_equipment = data.gymStrengthEquipment;
  if (data.other_activities !== undefined) payload.other_activities = data.other_activities;
  if (data.preferred_schedule !== undefined) payload.preferred_schedule = data.preferred_schedule;
  if (data.preferred_days !== undefined) payload.preferred_days = data.preferred_days;
  const result = await supabase.from("onboarding_data").upsert(payload, { onConflict: "user_id" });
  return logIfError("saveOnboardingData", result);
}

export async function savePlanMetadata(
  userId: string,
  data: {
    day_descriptions?: UserProfile["day_descriptions"];
    plan_pillars?: UserProfile["plan_pillars"];
    walkthrough_seen?: boolean;
  }
) {
  const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (data.day_descriptions !== undefined) payload.day_descriptions = data.day_descriptions;
  if (data.plan_pillars !== undefined) payload.plan_pillars = data.plan_pillars;
  if (data.walkthrough_seen !== undefined) payload.walkthrough_seen = data.walkthrough_seen;
  const result = await supabase.from("plan_metadata").upsert(payload, { onConflict: "user_id" });
  return logIfError("savePlanMetadata", result);
}

export async function saveUserProgress(
  userId: string,
  data: {
    completed_days?: string[];
    current_streak?: number;
    longest_streak?: number;
  }
) {
  const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (data.completed_days !== undefined) payload.completed_days = data.completed_days;
  if (data.current_streak !== undefined) payload.current_streak = data.current_streak;
  if (data.longest_streak !== undefined) payload.longest_streak = data.longest_streak;
  const result = await supabase.from("user_progress").upsert(payload, { onConflict: "user_id" });
  return logIfError("saveUserProgress", result);
}

export async function markWalkthroughSeen(userId: string) {
  return supabase.from("plan_metadata").update({ walkthrough_seen: true }).eq("user_id", userId);
}

export async function savePlan(userId: string, plan: FullTrainingPlan) {
  return supabase.from("plans").upsert({
    user_id: userId,
    plan_json: plan,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

export async function loadUserData(userId: string): Promise<{
  profile: UserProfile | null;
  plan: FullTrainingPlan | null;
}> {
  const [
    { data: profileRow },
    { data: onboardingRow },
    { data: planMetaRow },
    { data: progressRow },
    { data: planRow },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("onboarding_data").select("*").eq("user_id", userId).single(),
    supabase.from("plan_metadata").select("*").eq("user_id", userId).single(),
    supabase.from("user_progress").select("*").eq("user_id", userId).single(),
    supabase.from("plans").select("*").eq("user_id", userId).single(),
  ]);

  // profiles es la tabla "ancla" — sin fila ahí, no hay perfil (usuario nuevo genuino).
  // Las otras 3 son opcionales/vacías hasta que ese dato exista (ej. plan_metadata
  // recién se llena cuando Gemini genera el primer plan).
  let profile: UserProfile | null = null;
  if (profileRow) {
    profile = {
      name: profileRow.nombre ?? "",
      apellido: profileRow.apellido ?? undefined,
      age: profileRow.edad ?? 0,
      weight: profileRow.weight ?? 0,
      height: profileRow.height ?? 0,
      gender: profileRow.gender ?? "",
      avatar_url: profileRow.avatar_url ?? undefined,

      goals: onboardingRow?.objetivo ? onboardingRow.objetivo.split(",") : [],
      objective: onboardingRow?.objective ?? "",
      muscle_focus: onboardingRow?.muscle_focus ?? [],
      medicalConditions: onboardingRow?.condiciones ? onboardingRow.condiciones.split(",") : [],
      experience: onboardingRow?.nivel ?? "",
      daysPerWeek: onboardingRow?.dias_semana ?? 3,
      sessionDuration: onboardingRow?.session_duration ?? "60 min",
      cardioEquipment: onboardingRow?.cardio_equipment ?? [],
      strengthEquipment: onboardingRow?.strength_equipment ?? [],
      exercisesToAvoid: onboardingRow?.exercises_to_avoid ?? "",
      injuriesOrLimitations: onboardingRow?.injuries ?? "",
      specificGoal: onboardingRow?.specific_goal ?? "",
      trainingLocation: onboardingRow?.training_location ?? undefined,
      locationByDay: onboardingRow?.location_by_day ?? undefined,
      homeEquipment: onboardingRow?.home_equipment ?? [],
      gymCardioEquipment: onboardingRow?.gym_cardio_equipment ?? [],
      gymStrengthEquipment: onboardingRow?.gym_strength_equipment ?? [],
      other_activities: onboardingRow?.other_activities ?? [],
      preferred_schedule: onboardingRow?.preferred_schedule ?? undefined,
      preferred_days: onboardingRow?.preferred_days ?? undefined,

      day_descriptions: planMetaRow?.day_descriptions ?? undefined,
      plan_pillars: planMetaRow?.plan_pillars ?? undefined,
      walkthrough_seen: planMetaRow?.walkthrough_seen ?? false,

      completed_days: progressRow?.completed_days ?? [],
      current_streak: progressRow?.current_streak ?? 0,
      longest_streak: progressRow?.longest_streak ?? 0,
    } as UserProfile;
  }

  return {
    profile,
    plan: (planRow?.plan_json as FullTrainingPlan) ?? null,
  };
}

export async function saveDailyMetric(
  userId: string,
  date: string,
  data: { peso?: number; agua?: number; sueno?: number; sleep_quality?: string }
) {
  const payload: Record<string, unknown> = { user_id: userId, date };
  if (data.peso !== undefined) payload.peso = data.peso;
  if (data.agua !== undefined) payload.agua = data.agua;
  if (data.sueno !== undefined) payload.sueno = data.sueno;
  if (data.sleep_quality !== undefined) payload.sleep_quality = data.sleep_quality;
  return supabase
    .from("daily_metrics")
    .upsert(payload, { onConflict: "user_id,date" });
}

export async function loadDailyMetrics(
  userId: string
): Promise<{ date: string; peso?: number; agua?: number; sueno?: number; sleep_quality?: string }[]> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, peso, agua, sueno, sleep_quality")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function saveGymAttendance(userId: string, date: string) {
  return supabase
    .from("gym_attendance")
    .upsert({ user_id: userId, date }, { onConflict: "user_id,date" });
}

export async function deleteGymAttendance(userId: string, date: string) {
  return supabase
    .from("gym_attendance")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
}

export async function loadGymAttendance(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("gym_attendance")
    .select("date")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => r.date as string);
}

export async function saveExerciseLog(
  userId: string,
  date: string,
  exerciseName: string,
  data: { peso?: string; reps?: string }
) {
  const payload: Record<string, unknown> = { user_id: userId, date, exercise_name: exerciseName };
  if (data.peso !== undefined) payload.peso = data.peso;
  if (data.reps !== undefined) payload.reps = data.reps;
  return supabase
    .from("exercise_logs")
    .upsert(payload, { onConflict: "user_id,date,exercise_name" });
}

export async function loadExerciseLogs(
  userId: string
): Promise<{ date: string; exercise_name: string; peso?: string; reps?: string }[]> {
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("date, exercise_name, peso, reps")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function saveWorkoutLog(userId: string, date: string, log: WorkoutLog) {
  return supabase.from("workout_logs").upsert(
    { user_id: userId, date, log_json: log, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" }
  );
}

export async function loadWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("date, log_json")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => row.log_json as WorkoutLog);
}

export async function saveNutritionGuide(userId: string, guide: NutritionGuide) {
  return supabase.from("nutrition_guides").upsert(
    { user_id: userId, guide_json: guide, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

export async function loadNutritionGuide(userId: string): Promise<NutritionGuide | null> {
  const { data, error } = await supabase
    .from("nutrition_guides")
    .select("guide_json")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return (data.guide_json as NutritionGuide) ?? null;
}

export async function savePushSubscription(userId: string, subscription: PushSubscription) {
  const json = subscription.toJSON();
  return supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
}

/** Merges Supabase logs with localStorage logs (localStorage wins on same date for backwards compat) */
export async function loadWorkoutLogsMerged(userId: string | null): Promise<WorkoutLog[]> {
  const local: WorkoutLog[] = (() => {
    try { return JSON.parse(localStorage.getItem("workoutLogs") ?? "[]"); } catch { return []; }
  })();

  if (!userId) return local;

  try {
    const remote = await loadWorkoutLogs(userId);
    const byDate = new Map<string, WorkoutLog>();
    for (const log of remote) byDate.set(log.date, log);
    for (const log of local) byDate.set(log.date, log);
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return local;
  }
}
