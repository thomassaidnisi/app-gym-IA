export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  goals: string[];
  objective?: string;
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
  applied?: boolean;
  timestamp: number;
}

export interface CoachResponse {
  coach_message: string;
  plan_modified: boolean;
  updated_plan: FullTrainingPlan | null;
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

export interface SessionState {
  phase: "intro" | "exercising" | "resting" | "transition" | "summary";
  currentBlockIndex: number;
  currentExerciseIndex: number;
  currentSet: number;
  totalSets: number;
  restSeconds: number;
  restRemaining: number;
  completedSets: CompletedSet[];
  sessionStartTime: Date;
  sessionNotes: string;
  isLastExercise: boolean;
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

