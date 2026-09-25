import { supabase } from "./supabase";
import { UserProfile, FullTrainingPlan, WorkoutLog, NutritionGuide } from "../types";

export async function saveProfile(userId: string, profile: UserProfile) {
  const payload = {
    id: userId,
    nombre: profile.name,
    apellido: (profile as any).apellido ?? null,
    fecha_nacimiento: (profile as any).fecha_nacimiento ?? null,
    edad: profile.age,
    weight: profile.weight ?? null,
    height: profile.height ?? null,
    gender: profile.gender ?? null,
    objetivo: profile.goals?.join(",") ?? null,
    objective: profile.objective ?? null,
    muscle_focus: profile.muscle_focus ?? null,
    nivel: profile.experience ?? null,
    dias_semana: profile.daysPerWeek ?? null,
    condiciones: profile.medicalConditions?.join(",") ?? null,
    session_duration: profile.sessionDuration ?? null,
    cardio_equipment: profile.cardioEquipment ?? null,
    strength_equipment: profile.strengthEquipment ?? null,
    exercises_to_avoid: profile.exercisesToAvoid ?? null,
    injuries: profile.injuriesOrLimitations ?? null,
    specific_goal: profile.specificGoal ?? null,
    training_location: profile.trainingLocation ?? null,
    location_by_day: profile.locationByDay ?? null,
    home_equipment: profile.homeEquipment ?? null,
    gym_cardio_equipment: profile.gymCardioEquipment ?? null,
    gym_strength_equipment: profile.gymStrengthEquipment ?? null,
    avatar_url: profile.avatar_url ?? null,
    other_activities: profile.other_activities ?? null,
    preferred_schedule: profile.preferred_schedule ?? null,
    day_descriptions: profile.day_descriptions ?? null,
    plan_pillars: profile.plan_pillars ?? null,
    walkthrough_seen: profile.walkthrough_seen ?? false,
    completed_days: profile.completed_days ?? null,
    current_streak: profile.current_streak ?? 0,
    longest_streak: profile.longest_streak ?? 0,
    updated_at: new Date().toISOString(),
  };
  console.log("upsert payload day_descriptions:", payload.day_descriptions ? "PRESENTE" : "AUSENTE");
  console.log("upsert payload plan_pillars:", payload.plan_pillars ? "PRESENTE" : "AUSENTE");
  const result = await supabase.from("profiles").upsert(payload);
  if (result.error) {
    // supabase-js no rechaza la promesa en fallas lógicas (RLS, constraint, etc.) —
    // sin este chequeo explícito, un saveProfile().catch(...) en el caller nunca se
    // entera de que el upsert falló silenciosamente.
    alert("saveProfile falló: " + result.error.message);
    console.error("saveProfile error:", result.error);
  }
  return result;
}

export async function markWalkthroughSeen(userId: string) {
  return supabase.from("profiles").update({ walkthrough_seen: true }).eq("id", userId);
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
  const [{ data: profileRow }, { data: planRow }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("plans").select("*").eq("user_id", userId).single(),
  ]);

  console.log("day_descriptions cargado:", profileRow?.day_descriptions);

  let profile: UserProfile | null = null;
  if (profileRow) {
    profile = {
      name: profileRow.nombre ?? "",
      age: profileRow.edad ?? 0,
      weight: profileRow.weight ?? 0,
      height: profileRow.height ?? 0,
      gender: profileRow.gender ?? "",
      goals: profileRow.objetivo ? profileRow.objetivo.split(",") : [],
      objective: profileRow.objective ?? "",
      muscle_focus: profileRow.muscle_focus ?? [],
      medicalConditions: profileRow.condiciones ? profileRow.condiciones.split(",") : [],
      experience: profileRow.nivel ?? "",
      daysPerWeek: profileRow.dias_semana ?? 3,
      sessionDuration: profileRow.session_duration ?? "60 min",
      cardioEquipment: profileRow.cardio_equipment ?? [],
      strengthEquipment: profileRow.strength_equipment ?? [],
      exercisesToAvoid: profileRow.exercises_to_avoid ?? "",
      injuriesOrLimitations: profileRow.injuries ?? "",
      specificGoal: profileRow.specific_goal ?? "",
      trainingLocation: profileRow.training_location ?? undefined,
      locationByDay: profileRow.location_by_day ?? undefined,
      homeEquipment: profileRow.home_equipment ?? [],
      gymCardioEquipment: profileRow.gym_cardio_equipment ?? [],
      gymStrengthEquipment: profileRow.gym_strength_equipment ?? [],
      avatar_url: profileRow.avatar_url ?? undefined,
      other_activities: profileRow.other_activities ?? [],
      preferred_schedule: profileRow.preferred_schedule ?? undefined,
      day_descriptions: profileRow.day_descriptions ?? undefined,
      plan_pillars: profileRow.plan_pillars ?? undefined,
      walkthrough_seen: profileRow.walkthrough_seen ?? false,
      completed_days: profileRow.completed_days ?? [],
      current_streak: profileRow.current_streak ?? 0,
      longest_streak: profileRow.longest_streak ?? 0,
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
