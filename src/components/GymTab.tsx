import React, { useState, useEffect, useRef } from "react";
import { FullTrainingPlan, UserProfile, DayPlan, ProgressionSuggestion, PausedSession, DayDescription, DailyCheckinData, DayState } from "../types";
import { WorkoutSession } from "./WorkoutSession";
import {
  Dumbbell, Clock, Play, Youtube, Check, FileText,
  PersonStanding, Footprints, Bike, Moon, Zap, Flame, CalendarDays, ChevronDown, X, RotateCcw, BookOpen,
  Activity, Home, AlertTriangle, BedDouble, CheckCircle, MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRestTimer } from "./RestTimerContext";
import { useAuth } from "./AuthContext";
import { saveExerciseLog, getTodayCheckin, loadTodayWorkoutLog, saveGymAttendance } from "../lib/db";
import { getReadinessInfo } from "../lib/readiness";
import { markDayCompleted } from "../lib/streak";
import { DailyCheckin } from "./DailyCheckin";
import { useCoachMessage } from "../hooks/useCoachMessage";

interface GymTabProps {
  plan: FullTrainingPlan;
  profile: UserProfile;
  coachSuggestions?: ProgressionSuggestion[];
  onOpenCoach?: (initialMessage: string) => void;
  onOpenProfile?: () => void;
  onOpenStats?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onOpenWalkthrough?: () => void;
}

const ENERGY_LABELS: Record<number, string> = { 1: "Muy baja", 2: "Baja", 3: "Normal", 4: "Alta", 5: "Muy alta" };
const SORENESS_LABELS: Record<number, string> = { 1: "Muy cargados", 2: "Algo cargados", 3: "Bien", 4: "Frescos", 5: "Perfectos" };

const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

const WORKOUT_ICON_RULES: Array<{
  keywords: string[];
  Icon: React.FC<{ className?: string; strokeWidth?: number }>;
}> = [
  { keywords: ["descanso", "rest"],                       Icon: Moon },
  { keywords: ["leg", "pierna"],                          Icon: Footprints },
  { keywords: ["cardio", "bike", "cycling", "bicicleta"], Icon: Bike },
  { keywords: ["push", "empuje"],                         Icon: Dumbbell },
  { keywords: ["pull", "jalón", "jalon"],                 Icon: PersonStanding },
  { keywords: ["upper", "cuerpo", "full", "completo"],    Icon: Zap },
];

const getWorkoutIcon = (routineName: string, className = "w-4 h-4"): React.ReactElement => {
  const name = routineName.toLowerCase();
  for (const { keywords, Icon } of WORKOUT_ICON_RULES) {
    if (keywords.some((kw) => name.includes(kw))) {
      return <Icon className={className} strokeWidth={1.5} />;
    }
  }
  return <Dumbbell className={className} strokeWidth={1.5} />;
};

const shortName = (name: string) => name.split("—")[0].split("-")[0].trim();

const DAY_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  fuerza:       { bg: "rgba(34,197,94,0.15)",  text: "#4ade80", label: "Fuerza" },
  cardio:       { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Cardio" },
  movilidad:    { bg: "rgba(168,85,247,0.15)", text: "#c084fc", label: "Movilidad" },
  cancha:       { bg: "rgba(234,179,8,0.15)",  text: "#facc15", label: "Cancha" },
  descanso:     { bg: "rgba(161,161,170,0.15)",text: "#a1a1aa", label: "Descanso" },
  recuperacion: { bg: "rgba(45,212,191,0.15)", text: "#2dd4bf", label: "Recuperación" },
  mixto:        { bg: "rgba(249,115,22,0.15)", text: "#fb923c", label: "Mixto" },
};

const DayPopup: React.FC<{
  dayName: string;
  description: DayDescription | undefined;
  onClose: () => void;
}> = ({ dayName, description, onClose }) => {
  const typeStyle = description ? DAY_TYPE_STYLES[description.type] : undefined;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl p-6 bg-zinc-900/95 backdrop-blur-md border border-zinc-800"
      >
        <h3 className="text-xl font-bold text-white mb-1 capitalize">{dayName}</h3>

        {description ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              {typeStyle && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
                >
                  {typeStyle.label}
                </span>
              )}
              <span className="text-sm text-zinc-400">
                {description.title} · {description.duration}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{description.note}</p>
          </>
        ) : (
          <p className="text-sm text-zinc-400 leading-relaxed mt-2">
            Regenerá tu plan para ver la descripción de este día.
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl text-sm font-bold bg-brand text-black"
        >
          Cerrar
        </button>
      </motion.div>
    </div>
  );
};

export const GymTab: React.FC<GymTabProps> = ({ plan, profile, coachSuggestions = [], onOpenCoach, onOpenProfile, onOpenStats, onProfileUpdated, onOpenWalkthrough }) => {
  const { startTimer } = useRestTimer();
  const { user } = useAuth();

  const [dismissTick, setDismissTick] = useState(0);

  const handleOpenCoachSuggestions = () => {
    if (!onOpenCoach) return;
    onOpenCoach(coachSuggestions.map((s) => s.message).join("\n"));
  };

  const validTrainDays = plan.days && plan.days.length > 0 ? plan.days : [];
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const activeDay: DayPlan | undefined = validTrainDays[activeDayIdx];

  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [logInputs, setLogInputs] = useState<Record<string, string>>({});
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [todayLogs, setTodayLogs] = useState<Record<string, string>>({});
  const [todayRepsLogs, setTodayRepsLogs] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [daysSinceLastWorkout, setDaysSinceLastWorkout] = useState<number | null>(null);

  const [todayCheckin, setTodayCheckin] = useState<DailyCheckinData | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [todayWorkoutSummary, setTodayWorkoutSummary] = useState<{ duration: number; totalSets: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    getTodayCheckin(user.id).then(setTodayCheckin).catch(() => {});
  }, [user]);

  const { message: coachMessage, isLoading: coachIsLoading } = useCoachMessage(profile, todayCheckin);

  const [sessionDay, setSessionDay] = useState<DayPlan | null>(null);
  const [resumeState, setResumeState] = useState<PausedSession | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const [pausedSession, setPausedSession] = useState<PausedSession | null>(() => {
    try {
      const raw = localStorage.getItem("paused_session");
      return raw ? (JSON.parse(raw) as PausedSession) : null;
    } catch {
      return null;
    }
  });

  const handleResumeSession = () => {
    if (!pausedSession) return;
    const matchDay = plan.days.find((d) => d.name === pausedSession.dayName);
    localStorage.removeItem("paused_session");
    if (!matchDay) {
      setPausedSession(null);
      return;
    }
    setResumeState(pausedSession);
    setPausedSession(null);
    setSessionDay(matchDay);
  };

  const handleDismissPausedSession = () => {
    localStorage.removeItem("paused_session");
    setPausedSession(null);
  };

  const [heroExpanded, setHeroExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem("healty_hero_expanded");
    return saved === null ? true : saved === "true";
  });

  const toggleHero = () => {
    const next = !heroExpanded;
    setHeroExpanded(next);
    localStorage.setItem("healty_hero_expanded", String(next));
  };

  const calendarRef = useRef<HTMLDivElement>(null);

  const getLocalDateStr = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 10);
  };

  const todayStr = getLocalDateStr(new Date());

  useEffect(() => {
    if (!user) return;
    loadTodayWorkoutLog(user.id, todayStr).then(setTodayWorkoutSummary).catch(() => {});
  }, [user, todayStr]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Buenos días";
    if (h >= 12 && h < 20) return "Buenas tardes";
    return "Buenas noches";
  };

  const getDateString = () => {
    const s = new Date().toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const todayDayKey = DAY_KEYS[new Date().getDay()];
  const todayScheduleValue: string = (plan.weekly_schedule as any)[todayDayKey] ?? "";
  const isRestToday =
    !todayScheduleValue ||
    todayScheduleValue.toLowerCase().includes("descanso") ||
    todayScheduleValue.toLowerCase() === "rest";

  const todayDayPlan = isRestToday
    ? null
    : (validTrainDays.find(
        (d) => d.name.toLowerCase().trim() === todayScheduleValue.toLowerCase().trim()
      ) ?? null);

  const todayDayIdx = todayDayPlan ? validTrainDays.indexOf(todayDayPlan) : -1;
  const todayExerciseCount = todayDayPlan
    ? todayDayPlan.blocks.reduce((sum, b) => sum + b.exercises.length, 0)
    : 0;
  const todayBlockCount = todayDayPlan?.blocks.length ?? 0;

  // day_descriptions: la key es el nombre del día en español minúscula (ej. "lunes")
  const todayDescKey = new Date().toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase();
  const todayDesc: DayDescription | undefined = profile.day_descriptions?.[todayDescKey];
  const isRestByDesc = todayDesc
    ? todayDesc.type === "descanso" || todayDesc.type === "recuperacion"
    : null;
  // Sin day_descriptions (o sin entrada para hoy) → cae al fallback existente basado en el plan.
  const showTodayTraining = isRestByDesc === null ? !!todayDayPlan : (!isRestByDesc && !!todayDayPlan);

  const getNextTrainingDayLabel = (): string | null => {
    const dayNamesES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const todayIdx = new Date().getDay();
    for (let i = 1; i <= 7; i++) {
      const nextIdx = (todayIdx + i) % 7;
      const val: string = (plan.weekly_schedule as any)[DAY_KEYS[nextIdx]] ?? "";
      if (val && !val.toLowerCase().includes("descanso") && val.toLowerCase() !== "rest") {
        return dayNamesES[nextIdx];
      }
    }
    return null;
  };

  const nextTrainingDay = getNextTrainingDayLabel();

  const alreadyCompleted = profile.completed_days?.includes(todayStr) ?? false;

  const dayState: DayState = !todayDesc
    ? "no_plan"
    : alreadyCompleted
    ? "completed"
    : todayDesc.type === "descanso" || todayDesc.type === "recuperacion"
    ? "rest"
    : todayDesc.type === "fuerza" || todayDesc.type === "cardio" || todayDesc.type === "movilidad"
    ? "gym"
    : "other";

  const findNextGymDay = (): { label: string; desc: DayDescription } | null => {
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase();
      const desc = profile.day_descriptions?.[key];
      if (desc && desc.type !== "descanso" && desc.type !== "recuperacion") {
        const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
        const label = i === 1 ? "Mañana" : `El ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
        return { label, desc };
      }
    }
    return null;
  };

  const nextGymDay = dayState === "rest" ? findNextGymDay() : null;

  const handleRegisterAttendance = () => {
    if (!user) return;
    saveGymAttendance(user.id, todayStr).catch(console.error);
    markDayCompleted(user.id, todayStr, profile, plan)
      .then((updated) => onProfileUpdated?.(updated))
      .catch((err) => console.error("Error registrando asistencia:", err));
  };

  useEffect(() => {
    const logs: Record<string, string> = {};
    const repsLogs: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`log_${todayStr}_`)) {
        const exerciseName = key.replace(`log_${todayStr}_`, "");
        const value = localStorage.getItem(key);
        if (value) logs[exerciseName] = value;
      }
      if (key && key.startsWith(`reps_${todayStr}_`)) {
        const exerciseName = key.replace(`reps_${todayStr}_`, "");
        const value = localStorage.getItem(key);
        if (value) repsLogs[exerciseName] = value;
      }
    }
    setTodayLogs(logs);
    setTodayRepsLogs(repsLogs);

    let s = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (localStorage.getItem(`gym_${getLocalDateStr(d)}`) === "true") s++;
      else break;
    }
    setStreak(s);

    let lastDays: number | null = null;
    for (let i = 1; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (localStorage.getItem(`gym_${getLocalDateStr(d)}`) === "true") { lastDays = i; break; }
    }
    setDaysSinceLastWorkout(lastDays);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let w = 0;
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + mondayOffset + i);
      if (d > now) break;
      if (localStorage.getItem(`gym_${getLocalDateStr(d)}`) === "true") w++;
    }
    setWeekSessions(w);
  }, [todayStr, statsRefreshKey]);

  const toggleExpand = (exerciseName: string) => {
    setExpandedExercises((prev) => ({ ...prev, [exerciseName]: !prev[exerciseName] }));
  };

  const handleSaveWeight = (exerciseName: string) => {
    const weightVal = logInputs[exerciseName]?.trim();
    const repsVal = repsInputs[exerciseName]?.trim();
    if (!weightVal && !repsVal) return;
    let normalizedWeight: string | undefined;
    if (weightVal) {
      normalizedWeight = /^\d+(\.\d+)?$/.test(weightVal) ? `${weightVal} kg` : weightVal;
      localStorage.setItem(`log_${todayStr}_${exerciseName}`, normalizedWeight);
      setTodayLogs((prev) => ({ ...prev, [exerciseName]: normalizedWeight! }));
    }
    if (repsVal) {
      localStorage.setItem(`reps_${todayStr}_${exerciseName}`, repsVal);
      setTodayRepsLogs((prev) => ({ ...prev, [exerciseName]: repsVal }));
    }
    if (user) {
      saveExerciseLog(user.id, todayStr, exerciseName, {
        peso: normalizedWeight,
        reps: repsVal || undefined,
      }).catch(console.error);
    }
    const alertBox = document.getElementById("log-success-toast");
    if (alertBox) {
      alertBox.classList.remove("opacity-0", "translate-y-2");
      alertBox.classList.add("opacity-100", "translate-y-0");
      setTimeout(() => {
        alertBox.classList.add("opacity-0", "translate-y-2");
        alertBox.classList.remove("opacity-100", "translate-y-0");
      }, 3000);
    }
  };

  const handleStartWorkout = () => {
    if (todayDayIdx >= 0) {
      setActiveDayIdx(todayDayIdx);
      setTimeout(() => {
        calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const weekDays = [
    { name: "Lunes",     key: "monday" },
    { name: "Martes",    key: "tuesday" },
    { name: "Miércoles", key: "wednesday" },
    { name: "Jueves",    key: "thursday" },
    { name: "Viernes",   key: "friday" },
    { name: "Sábado",    key: "saturday" },
    { name: "Domingo",   key: "sunday" },
  ];


  const T = {
    bg:          "var(--bg-primary)",
    bgSec:       "var(--bg-secondary)",
    textPri:     "var(--text-primary)",
    textSec:     "var(--text-secondary)",
    textTer:     "var(--text-tertiary)",
    border:      "var(--border)",
    hero:        "var(--surface-hero)",
    heroBorder:  "var(--surface-hero-border)",
  };

  const isSuggestionsDismissedToday = dismissTick >= 0 &&
    localStorage.getItem(`coach_suggestions_dismissed_${todayStr}`) === "true";
  const showCoachSuggestions = coachSuggestions.length > 0 && !isSuggestionsDismissedToday;

  return (
    <div className="w-full">

      {/* ── SESIÓN PAUSADA ── */}
      {pausedSession && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(200,241,53,0.10)" }}
          >
            <RotateCcw className="w-4 h-4" style={{ color: "#c8f135" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: T.textPri }}>Tenés una sesión pausada</p>
            <p className="text-xs truncate" style={{ color: T.textSec }}>{pausedSession.dayName} — ¿Retomar?</p>
          </div>
          <button
            onClick={handleResumeSession}
            className="px-4 h-9 rounded-xl text-xs font-bold uppercase shrink-0"
            style={{ backgroundColor: "#c8f135", color: "#000" }}
          >
            Retomar
          </button>
          <button
            onClick={handleDismissPausedSession}
            className="hit-44 relative w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            aria-label="Descartar sesión pausada"
          >
            <X className="w-3.5 h-3.5" style={{ color: T.textTer }} />
          </button>
        </motion.div>
      )}

      {/* ── COACH PROACTIVO ── */}
      {showCoachSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl p-4 flex items-center gap-3 relative"
          style={{
            backgroundColor: "rgba(99,102,241,0.10)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <button
            onClick={handleOpenCoachSuggestions}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(99,102,241,0.18)" }}
            >
              <Zap className="w-4 h-4" style={{ color: "#818cf8" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: T.textPri }}>
                Tu Coach tiene {coachSuggestions.length > 1 ? `${coachSuggestions.length} sugerencias` : "una sugerencia"}
              </p>
              <p className="text-xs truncate" style={{ color: T.textSec }}>
                {coachSuggestions[0].exercise}: {coachSuggestions[0].message}
              </p>
            </div>
          </button>
          <button
            onClick={() => {
              localStorage.setItem(`coach_suggestions_dismissed_${todayStr}`, "true");
              setDismissTick((t) => t + 1);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            aria-label="Descartar sugerencia"
          >
            <X className="w-3.5 h-3.5" style={{ color: T.textTer }} />
          </button>
        </motion.div>
      )}

      {/* ── HERO TOGGLE ── */}
      <div className="pt-4 mb-1">
        <button
          onClick={toggleHero}
          className="flex items-center justify-between w-full py-1.5 select-none"
        >
          <span style={{ color: T.textTer }} className="text-[10px] font-semibold uppercase tracking-widest">
            Resumen de hoy
          </span>
          <motion.div
            animate={{ rotate: heroExpanded ? 0 : -90 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown className="w-4 h-4" style={{ color: T.textTer }} />
          </motion.div>
        </button>
      </div>

      {/* ── HERO CONTENT ── */}
      <AnimatePresence initial={false}>
        {heroExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="overflow-hidden"
          >
            <div className="mb-6 pt-2">

              {/* Hero: foto de fondo full-bleed, se extiende hasta cubrir las stats cards */}
              <div className="relative mx-0 mb-5 h-[420px] rounded-3xl overflow-hidden">
                <img
                  src={profile.gender?.toLowerCase() === "femenino" ? "/gym-hero-female.webp" : "/gym-hero.webp"}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={profile.gender?.toLowerCase() === "femenino" ? { objectPosition: "80% center" } : undefined}
                />
                {/* Degradé: transparente arriba → oscuro (no opaco) abajo, funde el hero con el fondo de la página */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="inline-block bg-black/40 backdrop-blur-md rounded-[32px] px-4 py-3">
                    <p className="text-white/80 text-sm font-medium leading-none">
                      {getGreeting()},
                    </p>
                    <h1 className="font-display text-5xl text-white leading-none tracking-wide mt-1.5">
                      {profile.name || "Atleta"}
                    </h1>
                    <p className="text-white/60 text-sm mt-1.5 capitalize">
                      {getDateString()}
                    </p>
                  </div>

                  {/* Mini-stats chips — sobre la foto, fondo semitransparente para legibilidad */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div
                      className={`rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center border backdrop-blur-sm ${
                        streak > 0 ? "bg-brand/15 border-brand/30" : "bg-black/40 border-white/10"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(249,115,22,0.12)" }}>
                        <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
                      </div>
                      <strong className={`font-display text-3xl tabular-nums leading-none ${streak > 0 ? "text-white" : "text-zinc-400"}`}>
                        {streak}
                      </strong>
                      <span className="text-xs tracking-widest font-semibold leading-none uppercase text-zinc-300">
                        {streak === 1 ? "día racha" : "días racha"}
                      </span>
                    </div>

                    <div className="rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center bg-black/40 backdrop-blur-sm border border-white/10">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(14,165,233,0.12)" }}>
                        <CalendarDays className="w-4 h-4 text-sky-500" strokeWidth={1.5} />
                      </div>
                      <strong className="font-display text-3xl tabular-nums leading-none text-white">{weekSessions}</strong>
                      <span className="text-xs tracking-widest font-semibold leading-none uppercase text-zinc-300">esta semana</span>
                    </div>

                    <div className="rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center bg-black/40 backdrop-blur-sm border border-white/10">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
                        <Zap className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                      </div>
                      <strong className="font-display text-3xl leading-none text-white">
                        {isRestToday ? (nextTrainingDay ?? "—") : "Hoy"}
                      </strong>
                      <span className="text-xs tracking-widest font-semibold leading-none uppercase text-zinc-300">próx. sesión</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onOpenProfile}
                  className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {(profile.name || "A").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {profile.plan_pillars && profile.plan_pillars.length > 0 && (
                  <button
                    onClick={onOpenWalkthrough}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
                    aria-label="Ver pilares del plan"
                  >
                    <BookOpen className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {/* Today card */}
              {dayState === "completed" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-3xl p-5 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-brand shrink-0" />
                    <h2 className="text-xl font-bold text-white leading-tight">¡Entrenamiento completado!</h2>
                  </div>
                  <p className="text-sm mt-2 text-zinc-400">
                    {todayWorkoutSummary
                      ? `${todayDesc?.title ?? "Entrenamiento"} · ${todayWorkoutSummary.duration} min · ${todayWorkoutSummary.totalSets} series`
                      : todayDesc?.title}
                  </p>
                  {onOpenStats && (
                    <button
                      onClick={onOpenStats}
                      className="mt-3 text-xs font-semibold text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-800"
                    >
                      Ver historial
                    </button>
                  )}
                </motion.div>
              ) : dayState === "rest" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-3xl p-5 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-zinc-400 shrink-0" />
                    <h2 className="text-xl font-bold text-white leading-tight">Día de descanso</h2>
                  </div>
                  <p className="text-sm mt-2 leading-relaxed text-zinc-400">El descanso es parte del progreso.</p>
                  {nextGymDay && (
                    <p className="text-[11px] mt-3 text-zinc-400">
                      {nextGymDay.label}: <span className="font-semibold text-white">{nextGymDay.desc.title} · {nextGymDay.desc.duration}</span>
                    </p>
                  )}
                </motion.div>
              ) : dayState === "other" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-3xl p-5 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-zinc-400 shrink-0" />
                    <h2 className="text-xl font-bold text-white leading-tight">{todayDesc?.title}</h2>
                  </div>
                  {todayDesc?.note && (
                    <p className="text-sm mt-2 leading-relaxed text-zinc-400">{todayDesc.note}</p>
                  )}
                  <button
                    onClick={handleRegisterAttendance}
                    className="mt-3 text-xs font-semibold text-black px-3 py-1.5 rounded-lg bg-brand"
                  >
                    Registrar asistencia
                  </button>
                </motion.div>
              ) : (dayState === "gym" || dayState === "no_plan") && showTodayTraining && todayDayPlan ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-3xl p-5 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    Entrenamiento de hoy
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/60 shrink-0">
                      {getWorkoutIcon(todayDayPlan.name, "w-5 h-5")}
                    </span>
                    <h2 className="text-xl font-bold text-white leading-tight">{todayDesc?.title || todayDayPlan.name}</h2>
                  </div>
                  <p className="text-white/60 text-sm mt-0.5">{todayDayPlan.focus}</p>
                  {todayDesc?.note && (
                    <p className="text-white/50 text-xs mt-1.5 leading-relaxed italic">{todayDesc.note}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[todayDesc?.duration || todayDayPlan.duration, `${todayBlockCount} bloques`, `${todayExerciseCount} ejercicios`].map((l) => (
                      <span key={l} className="text-[11px] bg-white/10 border border-white/10 text-white/50 px-2.5 py-1 rounded-full">{l}</span>
                    ))}
                    {(todayDayPlan as any).location && (
                      <span className="text-[11px] bg-white/10 border border-white/10 text-white/50 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                        {(todayDayPlan as any).location === "gym" ? (<><Dumbbell size={11} /> Gym</>) : (<><Home size={11} /> Casa</>)}
                      </span>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                    onClick={() => todayDayPlan && setSessionDay(todayDayPlan)}
                    className="mt-4 w-full bg-brand hover:bg-lime-400 text-black font-bold py-3 rounded-xl text-sm transition-all shadow-sm"
                  >
                    Empezar Entrenamiento →
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-3xl p-5 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Hoy</span>
                  <h2 className="text-xl font-bold mt-1 text-white">{todayDesc?.title || "Día de descanso"}</h2>
                  <p className="text-sm mt-2 leading-relaxed text-zinc-400">
                    {todayDesc?.note || "Día de recuperación. Caminá, hidratate, dormí 8 horas. Tu sistema nervioso se recarga hoy para que mañana rompas marcas."}
                  </p>
                  {nextTrainingDay && (
                    <p className="text-[11px] mt-3 text-zinc-400">
                      Próxima sesión: <span className="font-semibold text-white">{nextTrainingDay}</span>
                    </p>
                  )}
                </motion.div>
              )}

              {/* Coach proactivo */}
              {coachIsLoading ? (
                <div className="rounded-2xl px-5 py-4 mb-3 bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="h-3 rounded bg-zinc-800 animate-pulse w-full" />
                  <div className="h-3 rounded bg-zinc-800 animate-pulse w-2/3" />
                </div>
              ) : coachMessage ? (
                <div className="rounded-2xl px-5 py-4 mb-3 bg-zinc-900 border border-zinc-800 flex items-start gap-2">
                  <MessageSquare size={14} className="text-brand shrink-0 mt-0.5" />
                  <p className="text-sm text-white leading-relaxed">{coachMessage}</p>
                </div>
              ) : null}

              {/* ── CHECK-IN DIARIO ── */}
              {todayCheckin ? (
                (() => {
                  const info = getReadinessInfo(todayCheckin.readinessScore);
                  return (
                    <button
                      onClick={() => setShowCheckin(true)}
                      className="w-full text-left rounded-2xl p-4 mb-3 bg-zinc-900 border border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Índice de hoy</span>
                        <span className={`text-sm font-black ${info.color}`}>
                          {todayCheckin.readinessScore} {info.label.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{info.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white">
                        <span className="inline-flex items-center gap-1"><Moon size={14} className="text-zinc-400" /> {todayCheckin.sleepHours}h</span>
                        <span className="inline-flex items-center gap-1"><Zap size={14} className="text-zinc-400" /> {ENERGY_LABELS[todayCheckin.energyLevel] ?? todayCheckin.energyLevel}</span>
                        <span className="inline-flex items-center gap-1"><Activity size={14} className="text-zinc-400" /> {SORENESS_LABELS[todayCheckin.muscleSoreness] ?? todayCheckin.muscleSoreness}</span>
                      </div>
                    </button>
                  );
                })()
              ) : (
                <button
                  onClick={() => setShowCheckin(true)}
                  className="w-full text-left rounded-2xl p-4 mb-3 bg-zinc-900 border border-zinc-800"
                >
                  <p className="text-sm font-bold text-white inline-flex items-center gap-1.5"><Zap size={14} className="text-zinc-400" /> ¿Cómo llegás hoy?</p>
                  <p className="text-xs text-zinc-400 mt-1">Registrá tu estado en 30 seg →</p>
                </button>
              )}

              {/* Aviso de pausa prolongada */}
              {daysSinceLastWorkout !== null && daysSinceLastWorkout > 7 && (
                <div
                  className="rounded-2xl px-4 py-3 mb-3 flex items-start gap-3"
                  style={{ backgroundColor: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)" }}
                >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--status-warn)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--status-warn)" }}>
                    Volvés después de {daysSinceLastWorkout} días. Te recomendamos bajar el peso un 10–15% en esta primera sesión para evitar lesiones.
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CALENDAR SEMANAL ── */}
      <div ref={calendarRef}>
        <h3 className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: T.textTer }}>
          Calendario semanal
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-4 select-none scrollbar-none snap-x">
          {weekDays.map((day) => {
            const scheduleValue: string = (plan.weekly_schedule as any)[day.key] || "Descanso";
            const isRest = scheduleValue.toLowerCase() === "rest" || scheduleValue.toLowerCase().includes("descanso");
            const isGym = !isRest;
            const isToday = day.key === todayDayKey;
            return (
              <div
                key={day.key}
                onClick={() => setSelectedDay(day.name.toLowerCase())}
                className={`flex-none w-24 p-3 rounded-xl text-center transition-all cursor-pointer snap-start flex flex-col items-center justify-between gap-1 border ${
                  isGym ? "bg-brand border-transparent" : "bg-[var(--bg-primary)] border-[var(--border)]"
                } ${isToday ? "!border-brand/60" : ""}`}
              >
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isGym ? "text-black/60" : "text-[var(--text-secondary)]"}`}>
                  {day.name.substring(0, 3)}
                </span>
                <div className={isGym ? "text-black" : "text-[var(--text-secondary)]"}>
                  {isGym ? getWorkoutIcon(scheduleValue, "w-4 h-4") : <Moon className="w-4 h-4" strokeWidth={1.5} />}
                </div>
                <span className={`text-[9px] font-bold block max-w-full truncate px-1 leading-tight ${isGym ? "text-black" : "text-[var(--text-secondary)]"}`}>
                  {isGym ? shortName(scheduleValue) : "Rest"}
                </span>
                {profile.trainingLocation === "both" && isGym && (profile.locationByDay as any)?.[day.key] && (
                  <span className="opacity-60 leading-none">
                    {(profile.locationByDay as any)[day.key] === "gym" ? <Dumbbell size={9} /> : <Home size={9} />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DAY TABS ── */}
      <div className="flex mb-6 mt-4 select-none" style={{ borderBottom: `1px solid ${T.border}` }}>
        {validTrainDays.map((td, idx) => (
          <button
            key={td.id}
            onClick={() => setActiveDayIdx(idx)}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all relative"
            style={{ color: activeDayIdx === idx ? T.textPri : T.textTer }}
          >
            {td.name}
            {activeDayIdx === idx && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: T.textPri }} />
            )}
          </button>
        ))}
      </div>

      {/* ── ACTIVE DAY CONTENT ── */}
      {activeDay ? (
        <div>
          {/* Day Header */}
          <div className="rounded-2xl p-5 mb-6 bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xl select-none text-[var(--text-primary)]">
                {activeDay.name} — {activeDay.day_of_week}
              </span>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full select-none bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                {activeDay.duration}
              </span>
              {(activeDay as any).location && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full select-none bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] inline-flex items-center gap-1">
                  {(activeDay as any).location === "gym" ? (<><Dumbbell size={9} /> Gym</>) : (<><Home size={9} /> Casa</>)}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{activeDay.focus}</p>
          </div>

          {/* Calentamiento */}
          {activeDay.warmup && activeDay.warmup.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1 select-none">
                <Clock className="w-4 h-4 text-[var(--brand-ink)]" />
                <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  Calentamiento específico
                </h4>
              </div>
              <div className="rounded-2xl p-5 bg-[var(--bg-primary)] border border-[var(--border)]">
                <div className="divide-y divide-[var(--border)]">
                  {activeDay.warmup.map((warm, wIdx) => (
                    <div key={wIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                      <span className="text-xs font-semibold select-none mt-0.5 text-[var(--text-primary)]">{warm.sets_reps}</span>
                      <div>
                        <h5 className="text-xs font-semibold text-[var(--text-primary)]">{warm.name}</h5>
                        <p className="text-[11px] leading-normal mt-0.5 text-[var(--text-secondary)]">{warm.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bloques */}
          {activeDay.blocks && activeDay.blocks.length > 0 && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-2 mb-1 px-1 select-none">
                <Dumbbell className="w-4 h-4 text-[var(--brand-ink)]" />
                <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  Bloques de entrenamiento
                </h4>
              </div>

              {activeDay.blocks.map((block, bIdx) => (
                <div key={bIdx} className="rounded-2xl p-5 bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {block.is_superset ? "Superserie" : block.label || "Ejercicio"}
                    </span>
                    <h5 className="text-xs font-bold truncate max-w-[70%] text-[var(--text-secondary)]">{block.title}</h5>
                  </div>

                  <div className="space-y-3">
                    {block.exercises.map((ex, eIdx) => {
                      const isExpanded = !!expandedExercises[ex.name];
                      const loggedWeight = todayLogs[ex.name];
                      const loggedReps = todayRepsLogs[ex.name];
                      return (
                        <motion.div
                          key={eIdx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: eIdx * 0.05, duration: 0.25 }}
                          className={`rounded-2xl overflow-hidden cursor-pointer border border-[var(--border)] ${
                            isExpanded ? "bg-[var(--bg-primary)]" : "bg-[var(--bg-primary)]"
                          }`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpand(ex.name)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(ex.name); } }}
                            className="p-5 flex items-center justify-between gap-3.5"
                          >
                            <div className="flex-1 min-w-0">
                              <h6 className="text-sm font-semibold leading-snug break-words text-[var(--text-primary)]">
                                {ex.name}
                              </h6>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ex.muscles.map((m, mIdx) => (
                                  <span key={mIdx} className="text-[8px] tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 max-w-[44%]">
                              <div className="text-right select-none">
                                <span className={`font-bold tabular-nums leading-snug block break-words text-[var(--text-primary)] ${(`${ex.sets}x${ex.reps}`).length > 15 ? "text-base" : "text-xl"}`}>
                                  {ex.sets}x{ex.reps}
                                </span>
                                <div className="text-[9px] mt-1 block text-[var(--text-secondary)]">
                                  {loggedWeight ? `Hoy: ${loggedWeight}` : ex.weight}
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                strokeWidth={2}
                              />
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 border-t border-[var(--border)] bg-[var(--bg-primary)]">
                                  <div className="grid grid-cols-4 gap-2 mb-4 text-center select-none">
                                    {[
                                      { label: "Series", value: ex.sets },
                                      { label: "Reps", value: ex.reps },
                                      { label: "Peso Rec", value: ex.weight },
                                      { label: "Descanso", value: `${ex.rest_seconds}s` },
                                    ].map(({ label, value }) => (
                                      <div key={label} className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                                        <span className="text-[8px] block uppercase mb-0.5 text-[var(--text-secondary)]">{label}</span>
                                        <strong className="text-xs block truncate leading-tight font-bold tabular-nums text-[var(--text-primary)]">{value}</strong>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex gap-2 mb-4">
                                    <motion.button
                                      whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                      onClick={(e) => { e.stopPropagation(); startTimer(ex.rest_seconds, ex.name); }}
                                      className="flex-1 bg-brand hover:bg-lime-400 text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-black" />
                                      Descanso ({ex.rest_seconds}s)
                                    </motion.button>
                                    {ex.youtube_url && (
                                      <a
                                        href={ex.youtube_url}
                                        target="_blank"
                                        referrerPolicy="no-referrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]"
                                      >
                                        <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                                        Técnica
                                      </a>
                                    )}
                                  </div>

                                  <div className="pt-3 flex items-center gap-2 border-t border-[var(--border)]">
                                    <input
                                      type="text"
                                      value={logInputs[ex.name] || ""}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setLogInputs({ ...logInputs, [ex.name]: e.target.value })}
                                      placeholder={loggedWeight ? `Peso: ${loggedWeight}` : "Peso (ej: 50 kg)"}
                                      className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs focus:outline-none min-w-0 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
                                    />
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={repsInputs[ex.name] || ""}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setRepsInputs({ ...repsInputs, [ex.name]: e.target.value })}
                                      placeholder={loggedReps ? loggedReps : "Reps"}
                                      className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs focus:outline-none text-center bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
                                    />
                                    <motion.button
                                      whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                      onClick={(e) => { e.stopPropagation(); handleSaveWeight(ex.name); }}
                                      className="p-2 rounded-xl text-xs flex items-center justify-center gap-1 min-w-[56px] shrink-0 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Grabar</span>
                                    </motion.button>
                                  </div>

                                  <div className="mt-3 p-3 rounded-xl text-[11px] leading-relaxed select-text space-y-1 bg-[var(--bg-secondary)] border border-[var(--border)]">
                                    <p className="text-[var(--text-secondary)]">
                                      <strong className="text-[var(--text-primary)]">Técnica:</strong> {ex.technique_tip}
                                    </p>
                                    <p className="text-[var(--text-secondary)]">
                                      <strong className="text-red-500">Evitar:</strong> {ex.common_error}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enfriamiento */}
          {activeDay.cooldown && activeDay.cooldown.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1 select-none">
                <FileText className="w-4 h-4 text-[var(--brand-ink)]" />
                <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  Enfriamiento y Flexibilidad
                </h4>
              </div>
              <div className="rounded-2xl p-5 bg-[var(--bg-primary)] border border-[var(--border)]">
                <div className="divide-y divide-[var(--border)]">
                  {activeDay.cooldown.map((cool, cIdx) => (
                    <div key={cIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <h5 className="text-xs font-semibold text-[var(--text-primary)]">{cool.name}</h5>
                      <span className="font-semibold text-xs select-none shrink-0 text-[var(--text-secondary)]">{cool.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl p-8 select-none bg-[var(--bg-primary)] border border-dashed border-[var(--border)]">
          <Dumbbell className="w-12 h-12 block mx-auto mb-4 text-[var(--text-secondary)]" />
          <h4 className="font-semibold text-[var(--text-primary)]">Sin rutina para este día</h4>
          <p className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed text-[var(--text-secondary)]">
            Este día no tiene entrenamiento asignado en tu plan.
          </p>
        </div>
      )}

      {/* Day description popup */}
      <AnimatePresence>
        {selectedDay && (
          <DayPopup
            dayName={selectedDay}
            description={profile.day_descriptions?.[selectedDay]}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>

      {/* Daily check-in */}
      <AnimatePresence>
        {showCheckin && (
          <DailyCheckin
            onComplete={(score) => {
              setShowCheckin(false);
              if (user) getTodayCheckin(user.id).then(setTodayCheckin).catch(() => {});
            }}
            onClose={() => setShowCheckin(false)}
          />
        )}
      </AnimatePresence>

      {/* WorkoutSession portal */}
      {sessionDay && (
        <WorkoutSession
          day={sessionDay}
          resume={resumeState}
          profile={profile}
          plan={plan}
          onProfileUpdated={onProfileUpdated}
          onClose={() => { setSessionDay(null); setResumeState(null); setStatsRefreshKey((k) => k + 1); }}
        />
      )}

      {/* Toast */}
      <div
        id="log-success-toast"
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 translate-y-2 z-50 text-xs font-semibold py-2.5 px-4 rounded-full flex items-center gap-1.5 shadow-xl transition-all duration-300 pointer-events-none"
        style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri }}
      >
        <Check className="w-4 h-4 text-[var(--brand-ink)]" />
        Log guardado correctamente
      </div>
    </div>
  );
};
