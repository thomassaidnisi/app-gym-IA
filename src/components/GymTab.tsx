import React, { useState, useEffect, useRef } from "react";
import { FullTrainingPlan, UserProfile, DayPlan } from "../types";
import { WorkoutSession } from "./WorkoutSession";
import {
  Dumbbell, Clock, Play, Youtube, Check, FileText,
  PersonStanding, Footprints, Bike, Moon, Zap, Flame, CalendarDays, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRestTimer } from "./RestTimerContext";
import { useAuth } from "./AuthContext";
import { saveExerciseLog } from "../lib/db";

interface GymTabProps {
  plan: FullTrainingPlan;
  profile: UserProfile;
}

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

export const GymTab: React.FC<GymTabProps> = ({ plan, profile }) => {
  const { startTimer } = useRestTimer();
  const { user } = useAuth();

  const validTrainDays = plan.days && plan.days.length > 0 ? plan.days : [];
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const activeDay: DayPlan | undefined = validTrainDays[activeDayIdx];

  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [logInputs, setLogInputs] = useState<Record<string, string>>({});
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [todayLogs, setTodayLogs] = useState<Record<string, string>>({});
  const [todayRepsLogs, setTodayRepsLogs] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [daysSinceLastWorkout, setDaysSinceLastWorkout] = useState<number | null>(null);

  const [sessionDay, setSessionDay] = useState<DayPlan | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

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

  const selectDayBySchedule = (routineName: string) => {
    if (!routineName || routineName.toLowerCase() === "rest" || routineName.toLowerCase().includes("descanso")) return;
    const idx = validTrainDays.findIndex(
      (d) => d.name.toLowerCase().trim() === routineName.toLowerCase().trim()
    );
    if (idx !== -1) setActiveDayIdx(idx);
  };

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

  return (
    <div className="w-full">

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

              {/* Greeting + Avatar */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-lg font-medium leading-none" style={{ color: T.textSec }}>
                    {getGreeting()},
                  </p>
                  <h1 className="text-4xl font-extrabold tracking-tight leading-tight mt-0.5" style={{ color: T.textPri }}>
                    {profile.name || "Atleta"}.
                  </h1>
                  <p className="text-sm mt-1.5 capitalize" style={{ color: T.textTer }}>
                    {getDateString()}
                  </p>
                </div>
              </div>

              {/* Today card */}
              {todayDayPlan ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="rounded-2xl p-5 mb-3"
                  style={{ backgroundColor: T.hero, borderColor: T.heroBorder, border: `1px solid ${T.heroBorder}` }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Entrenamiento de hoy
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/60 shrink-0">
                      {getWorkoutIcon(todayDayPlan.name, "w-5 h-5")}
                    </span>
                    <h2 className="text-xl font-bold text-white leading-tight">{todayDayPlan.name}</h2>
                  </div>
                  <p className="text-white/60 text-sm mt-0.5">{todayDayPlan.focus}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[todayDayPlan.duration, `${todayBlockCount} bloques`, `${todayExerciseCount} ejercicios`].map((l) => (
                      <span key={l} className="text-[11px] bg-white/10 border border-white/10 text-white/50 px-2.5 py-1 rounded-full">{l}</span>
                    ))}
                    {(todayDayPlan as any).location && (
                      <span className="text-[11px] bg-white/10 border border-white/10 text-white/50 px-2.5 py-1 rounded-full">
                        {(todayDayPlan as any).location === "gym" ? "🏋️ Gym" : "🏠 Casa"}
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
                  className="rounded-2xl p-5 mb-3 shadow-sm"
                  style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textTer }}>Hoy</span>
                  <h2 className="text-xl font-bold mt-1" style={{ color: T.textPri }}>Día de descanso</h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: T.textSec }}>
                    Día de recuperación. Caminá, hidratate, dormí 8 horas. Tu sistema nervioso se recarga hoy para que mañana rompas marcas.
                  </p>
                  {nextTrainingDay && (
                    <p className="text-[11px] mt-3" style={{ color: T.textTer }}>
                      Próxima sesión: <span className="font-semibold" style={{ color: T.textSec }}>{nextTrainingDay}</span>
                    </p>
                  )}
                </motion.div>
              )}

              {/* Aviso de pausa prolongada */}
              {daysSinceLastWorkout !== null && daysSinceLastWorkout > 7 && (
                <div
                  className="rounded-2xl px-4 py-3 mb-3 flex items-start gap-3"
                  style={{ backgroundColor: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)" }}
                >
                  <span className="text-base mt-0.5 shrink-0">⚠️</span>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(251,191,36,0.95)" }}>
                    Volvés después de {daysSinceLastWorkout} días. Te recomendamos bajar el peso un 10–15% en esta primera sesión para evitar lesiones.
                  </p>
                </div>
              )}

              {/* Mini-stats chips */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className="rounded-xl p-4 flex flex-col items-center gap-1.5 text-center"
                  style={{
                    backgroundColor: streak > 0 ? "rgba(200,241,53,0.1)" : T.bgSec,
                    border: streak > 0 ? "1px solid rgba(200,241,53,0.2)" : `1px solid ${T.border}`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(249,115,22,0.12)" }}>
                    <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
                  </div>
                  <strong className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: streak > 0 ? T.textPri : T.textTer }}>
                    {streak}
                  </strong>
                  <span className="text-[9px] uppercase tracking-wide font-semibold leading-none" style={{ color: T.textSec }}>
                    {streak === 1 ? "día racha" : "días racha"}
                  </span>
                </div>

                <div className="rounded-xl p-4 flex flex-col items-center gap-1.5 text-center" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(14,165,233,0.12)" }}>
                    <CalendarDays className="w-4 h-4 text-sky-500" strokeWidth={1.5} />
                  </div>
                  <strong className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: T.textPri }}>{weekSessions}</strong>
                  <span className="text-[9px] uppercase tracking-wide font-semibold leading-none" style={{ color: T.textSec }}>esta semana</span>
                </div>

                <div className="rounded-xl p-4 flex flex-col items-center gap-1.5 text-center" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
                    <Zap className="w-4 h-4 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <strong className="text-2xl font-extrabold leading-none" style={{ color: T.textPri }}>
                    {isRestToday ? (nextTrainingDay ?? "—") : "Hoy"}
                  </strong>
                  <span className="text-[9px] uppercase tracking-wide font-semibold leading-none" style={{ color: T.textSec }}>próx. sesión</span>
                </div>
              </div>

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
            return (
              <div
                key={day.key}
                onClick={() => isGym && selectDayBySchedule(scheduleValue)}
                className="flex-none w-24 p-3 rounded-2xl text-center transition-all cursor-pointer snap-start flex flex-col items-center justify-between gap-1 shadow-sm"
                style={{
                  backgroundColor: T.bg,
                  border: `1px solid ${T.border}`,
                  opacity: isRest ? 0.5 : 1,
                }}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: isGym ? T.textSec : T.textTer }}>
                  {day.name.substring(0, 3)}
                </span>
                <div style={{ color: isGym ? T.textPri : T.textTer }}>
                  {isGym ? getWorkoutIcon(scheduleValue, "w-4 h-4") : <Moon className="w-4 h-4" strokeWidth={1.5} />}
                </div>
                <span className="text-[9px] font-bold block max-w-full truncate px-1 leading-tight" style={{ color: isGym ? T.textPri : T.textTer }}>
                  {isGym ? shortName(scheduleValue) : "Rest"}
                </span>
                {profile.trainingLocation === "both" && isGym && (profile.locationByDay as any)?.[day.key] && (
                  <span className="text-[9px] opacity-50 leading-none">
                    {(profile.locationByDay as any)[day.key] === "gym" ? "🏋️" : "🏠"}
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
          <div className="rounded-2xl p-5 mb-6 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xl select-none" style={{ color: T.textPri }}>
                {activeDay.name} — {activeDay.day_of_week}
              </span>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full select-none" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
                {activeDay.duration}
              </span>
              {(activeDay as any).location && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full select-none" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
                  {(activeDay as any).location === "gym" ? "🏋️ Gym" : "🏠 Casa"}
                </span>
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: T.textSec }}>{activeDay.focus}</p>
          </div>

          {/* Calentamiento */}
          {activeDay.warmup && activeDay.warmup.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1 select-none">
                <Clock className="w-4 h-4 text-brand" />
                <h4 className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textTer }}>
                  Calentamiento específico
                </h4>
              </div>
              <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
                <div style={{ borderColor: T.border }} className="divide-y">
                  {activeDay.warmup.map((warm, wIdx) => (
                    <div key={wIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                      <span className="text-xs font-semibold select-none mt-0.5" style={{ color: T.textPri }}>{warm.sets_reps}</span>
                      <div>
                        <h5 className="text-xs font-semibold" style={{ color: T.textPri }}>{warm.name}</h5>
                        <p className="text-[11px] leading-normal mt-0.5" style={{ color: T.textSec }}>{warm.note}</p>
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
                <Dumbbell className="w-4 h-4 text-brand" />
                <h4 className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textTer }}>
                  Bloques de entrenamiento
                </h4>
              </div>

              {activeDay.blocks.map((block, bIdx) => (
                <div key={bIdx} className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
                      {block.is_superset ? "Superserie" : block.label || "Ejercicio"}
                    </span>
                    <h5 className="text-xs font-bold truncate max-w-[70%]" style={{ color: T.textSec }}>{block.title}</h5>
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
                          className="rounded-2xl overflow-hidden cursor-pointer"
                          style={{
                            background: isExpanded ? T.bg : "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: isExpanded ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                          }}
                        >
                          <div onClick={() => toggleExpand(ex.name)} className="p-4 flex items-center justify-between gap-3.5">
                            <div className="flex-1 min-w-0">
                              <h6 className="text-sm font-semibold leading-snug line-clamp-2 break-words" style={{ color: T.textPri }}>
                                {ex.name}
                              </h6>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ex.muscles.map((m, mIdx) => (
                                  <span key={mIdx} className="text-[8px] tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textSec }}>
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 max-w-[44%]">
                              <div className="text-right select-none">
                                <span className={`font-bold tabular-nums leading-snug block break-words ${(`${ex.sets}x${ex.reps}`).length > 15 ? "text-base" : "text-xl"}`} style={{ color: T.textPri }}>
                                  {ex.sets}x{ex.reps}
                                </span>
                                <div className="text-[9px] mt-1 block" style={{ color: T.textSec }}>
                                  {loggedWeight ? `Hoy: ${loggedWeight}` : ex.weight}
                                </div>
                              </div>
                              <span className="text-[10px] transition-transform shrink-0" style={{ color: isExpanded ? T.textPri : T.textTer, transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
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
                                <div className="p-4" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                                  <div className="grid grid-cols-4 gap-2 mb-4 text-center select-none">
                                    {[
                                      { label: "Series", value: ex.sets },
                                      { label: "Reps", value: ex.reps },
                                      { label: "Peso Rec", value: ex.weight },
                                      { label: "Descanso", value: `${ex.rest_seconds}s` },
                                    ].map(({ label, value }) => (
                                      <div key={label} className="p-2 rounded-xl" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
                                        <span className="text-[8px] block uppercase mb-0.5" style={{ color: T.textTer }}>{label}</span>
                                        <strong className="text-xs block truncate leading-tight font-bold tabular-nums" style={{ color: T.textPri }}>{value}</strong>
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
                                        className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                        style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                                      >
                                        <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                                        Técnica
                                      </a>
                                    )}
                                  </div>

                                  <div className="pt-3 flex items-center gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
                                    <input
                                      type="text"
                                      value={logInputs[ex.name] || ""}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setLogInputs({ ...logInputs, [ex.name]: e.target.value })}
                                      placeholder={loggedWeight ? `Peso: ${loggedWeight}` : "Peso (ej: 50 kg)"}
                                      className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs focus:outline-none min-w-0"
                                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
                                    />
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={repsInputs[ex.name] || ""}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setRepsInputs({ ...repsInputs, [ex.name]: e.target.value })}
                                      placeholder={loggedReps ? loggedReps : "Reps"}
                                      className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs focus:outline-none text-center"
                                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
                                    />
                                    <motion.button
                                      whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                      onClick={(e) => { e.stopPropagation(); handleSaveWeight(ex.name); }}
                                      className="p-2 rounded-xl text-xs flex items-center justify-center gap-1 min-w-[56px] shrink-0"
                                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Grabar</span>
                                    </motion.button>
                                  </div>

                                  <div className="mt-3 p-3 rounded-xl text-[11px] leading-relaxed select-text space-y-1" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
                                    <p style={{ color: T.textSec }}>
                                      <strong style={{ color: T.textPri }}>Técnica:</strong> {ex.technique_tip}
                                    </p>
                                    <p style={{ color: T.textSec }}>
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
                <FileText className="w-4 h-4 text-brand" />
                <h4 className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textTer }}>
                  Enfriamiento y Flexibilidad
                </h4>
              </div>
              <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
                <div style={{ borderColor: T.border }} className="divide-y">
                  {activeDay.cooldown.map((cool, cIdx) => (
                    <div key={cIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <h5 className="text-xs font-semibold" style={{ color: T.textPri }}>{cool.name}</h5>
                      <span className="font-semibold text-xs select-none shrink-0" style={{ color: T.textSec }}>{cool.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl p-8 shadow-sm select-none" style={{ backgroundColor: T.bg, border: `1px dashed ${T.border}` }}>
          <Dumbbell className="w-12 h-12 block mx-auto mb-4" style={{ color: T.textTer }} />
          <h4 className="font-semibold" style={{ color: T.textPri }}>Sin rutina para este día</h4>
          <p className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed" style={{ color: T.textSec }}>
            Este día no tiene entrenamiento asignado en tu plan.
          </p>
        </div>
      )}

      {/* WorkoutSession portal */}
      {sessionDay && (
        <WorkoutSession day={sessionDay} onClose={() => { setSessionDay(null); setStatsRefreshKey((k) => k + 1); }} />
      )}

      {/* Toast */}
      <div
        id="log-success-toast"
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 translate-y-2 z-50 text-xs font-semibold py-2.5 px-4 rounded-full flex items-center gap-1.5 shadow-xl transition-all duration-300 pointer-events-none"
        style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri }}
      >
        <Check className="w-4 h-4 text-brand" />
        Log guardado correctamente
      </div>
    </div>
  );
};
