export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  goals: string[];
  objective?: string;
  muscle_focus?: string[];
  medicalConditions: string[];
  experience: string;
  daysPerWeek: number;
  sessionDuration: string;
  cardioEquipment: string[];
  strengthEquipment: string[];
  exercisesToAvoid?: string;
  injuriesOrLimitations?: string;
  specificGoal?: string;
  trainingLocation?: "home" | "gym" | "both";
  locationByDay?: {
    monday?: "gym" | "home";
    tuesday?: "gym" | "home";
    wednesday?: "gym" | "home";
    thursday?: "gym" | "home";
    friday?: "gym" | "home";
    saturday?: "gym" | "home";
    sunday?: "gym" | "home";
  };
  homeEquipment?: string[];
  gymCardioEquipment?: string[];
  gymStrengthEquipment?: string[];
}

export interface WarmupItem {
  name: string;
  sets_reps: string;
  note: string;
}

export interface CooldownItem {
  name: string;
  duration: string;
}

export interface Exercise {
  name: string;
  muscles: string[];
  sets: number;
  reps: string;
  weight: string;
  rest_seconds: number;
  technique_tip: string;
  common_error: string;
  youtube_url: string;
  needs_review?: boolean;
}

export interface ExerciseBlock {
  type: "strength" | "hypertrophy" | string;
  is_superset: boolean;
  label: string;
  title: string;
  exercises: Exercise[];
}

export interface DayPlan {
  id: string;
  name: string;
  day_of_week: string;
  focus: string;
  duration: string;
  warmup: WarmupItem[];
  blocks: ExerciseBlock[];
  cooldown: CooldownItem[];
}

export interface FullTrainingPlan {
  plan_name: string;
  division: string;
  days_per_week: number;
  session_duration: string;
  progression_guide: string;
  cardio_note: string;
  medical_note: string | null;
  weekly_schedule: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  days: DayPlan[];
  source?: "ai_generated" | "uploaded_document";
}

export interface DailyStats {
  weight?: number;
  sleep?: number;
  sleep_quality?: "Malo" | "Regular" | "Bien" | "Excelente" | "";
  water?: number; // 0 to 8 cups
}

export interface ExerciseLog {
  id: string;
  date: string; // YYYY-MM-DD
  exerciseName: string;
  weight: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  planPatch?: FullTrainingPlan;
  nutritionPatch?: NutritionGuide;
  applied?: boolean;
  nutritionApplied?: boolean;
  timestamp: number;
}

export interface CoachResponse {
  coach_message: string;
  plan_modified: boolean;
  updated_plan: FullTrainingPlan | null;
  nutrition_modified: boolean;
  updated_nutrition_guide: NutritionGuide | null;
}

export interface ParsedPlanResponse {
  success: boolean;
  parsed_plan: FullTrainingPlan | null;
  inconsistency_warning: string | null;
  error: string | null;
}

export interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weight: number | null;
  reps: number;
  completedAt: Date;
}

export interface QueueItem {
  /** Stable ID: "b{blockIndex}-e{exerciseIndex}" from the original plan. */
  id: string;
  exercise: Exercise;
  block: ExerciseBlock;
}

export interface PausedSession {
  dayName: string;
  currentItemId: string;
  upcomingQueueIds: string[];
  completedQueueIds: string[];
  currentSet: number;
  totalSets: number;
  completedSets: CompletedSet[];
  sessionStartTime: string;
  pausedAt: number;
}

export interface SessionState {
  phase: "intro" | "exercising" | "resting" | "transition" | "summary";
  /** Exercises already finished, in execution order. */
  completedQueue: QueueItem[];
  /** Exercise currently being performed (null only before session starts). */
  currentItem: QueueItem | null;
  /** Exercises yet to be done — freely reorderable. */
  upcomingQueue: QueueItem[];
  currentSet: number;
  totalSets: number;
  restSeconds: number;
  restRemaining: number;
  completedSets: CompletedSet[];
  sessionStartTime: Date;
  sessionNotes: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayName: string;
  durationMinutes: number;
  totalVolumeKg: number;
  completedSets: CompletedSet[];
  notes: string;
  completedAt: Date;
}

export interface NutritionMacros {
  proteina_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

export interface NutritionDistribucionItem {
  momento: string;
  descripcion: string;
  ejemplos: string[];
  macros?: {
    proteina_g: number;
    carbohidratos_g: number;
    grasas_g: number;
    calorias: number;
  };
  razon?: string;
}

export interface NutritionSuplemento {
  nombre: string;
  dosis: string;
  motivo: string;
}

export interface NutritionGuide {
  calorias_diarias: number;
  tmb_calculada: number;
  tdee_calculado: number;
  objetivo: string;
  macros: NutritionMacros;
  distribucion: NutritionDistribucionItem[];
  suplementos: NutritionSuplemento[];
  datos_faltantes: string[];
  notas: string[];
  disclaimer: string;
}

export interface ProgressionSuggestion {
  exercise: string;
  currentWeight: string;
  currentReps: string;
  sessionsStuck: number;
  message: string;
}

