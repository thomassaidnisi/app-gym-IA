import React, { useState, useEffect } from "react";
import { WorkoutLog, FullTrainingPlan, UserProfile } from "../types";
import { Trophy, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "./AuthContext";
import { saveGymAttendance, deleteGymAttendance, loadGymAttendance, loadWorkoutLogsMerged } from "../lib/db";
import { markDayCompleted } from "../lib/streak";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
  brand:   "var(--color-brand)",
};

function getTodayStr() {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
}

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday (00:00 local) of the week containing `today`, offset by `weeksBack` weeks. */
function getWeekStart(weeksBack: number): string {
  const now = new Date();
  const dow = now.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday - weeksBack * 7);
  monday.setHours(0, 0, 0, 0);
  return formatLocalDate(monday);
}

function formatMemberSince(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

interface StatsTabProps {
  plan: FullTrainingPlan | null;
  profile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({ plan, profile, onProfileUpdated }) => {
  const { user } = useAuth();

  const [selectedDate] = useState<string>(getTodayStr());
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (!user) return;
    loadGymAttendance(user.id).then((dates) => {
      for (const date of dates) localStorage.setItem(`gym_${date}`, "true");
      loadMonthAttendance();
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadMonthAttendance();
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadWorkoutLogsMerged(user?.id ?? null).then(setWorkoutLogs).catch(() => {});
  }, [user]);

  const loadMonthAttendance = () => {
    const cache: Record<string, boolean> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gym_") && localStorage.getItem(key) === "true") cache[key] = true;
    }
    setAttendance(cache);
  };

  const toggleAttendance = (dayNum: number) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
    const attendKey = `gym_${dateStr}`;
    const newVal = !attendance[attendKey];
    if (newVal) localStorage.setItem(attendKey, "true"); else localStorage.removeItem(attendKey);
    setAttendance((prev) => { const u = { ...prev }; if (newVal) u[attendKey] = true; else delete u[attendKey]; return u; });
    if (user) {
      if (newVal) {
        saveGymAttendance(user.id, dateStr).catch(console.error);
        if (plan && profile) {
          markDayCompleted(user.id, dateStr, profile, plan)
            .then(onProfileUpdated)
            .catch((err) => console.error("Error actualizando racha:", err));
        }
      } else {
        deleteGymAttendance(user.id, dateStr).catch(console.error);
      }
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; };
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfWeek(currentYear, currentMonth);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); } else setCurrentMonth((m) => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); } else setCurrentMonth((m) => m + 1); };

  // Weekly stats
  const thisWeekStart = getWeekStart(0);
  const lastWeekStart = getWeekStart(1);
  const thisWeekLogs = workoutLogs.filter((l) => l.date >= thisWeekStart);
  const lastWeekLogs = workoutLogs.filter((l) => l.date >= lastWeekStart && l.date < thisWeekStart);

  const thisWeekSessions = thisWeekLogs.length;
  const thisWeekVolume = thisWeekLogs.reduce((sum, l) => sum + (l.totalVolumeKg || 0), 0);
  const thisWeekMinutes = thisWeekLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  const lastWeekVolume = lastWeekLogs.reduce((sum, l) => sum + (l.totalVolumeKg || 0), 0);
  const isFirstWeek = lastWeekLogs.length === 0;
  const volumeDiff = thisWeekVolume - lastWeekVolume;

  const nameInitial = (profile?.name?.trim()?.[0] ?? "?").toUpperCase();
  const fullName = [profile?.name, profile?.apellido].filter(Boolean).join(" ");

  return (
    <div className="w-full">
      {/* A) Header del perfil */}
      <div className="pt-4 pb-6">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 font-black text-2xl"
              style={{ backgroundColor: "rgba(200,241,53,0.15)", color: T.brand }}
            >
              {nameInitial}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight truncate" style={{ color: T.textPri }}>{fullName || "—"}</h1>
            <p className="text-xs mt-0.5" style={{ color: T.textSec }}>Miembro desde {formatMemberSince(user?.created_at)}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <div className="flex-1 rounded-2xl py-2.5 px-2 text-center bg-zinc-900">
            <span className="block text-sm font-bold text-white">🔥 {profile?.current_streak ?? 0}</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">días racha</span>
          </div>
          <div className="flex-1 rounded-2xl py-2.5 px-2 text-center bg-zinc-900">
            <span className="block text-sm font-bold text-white">📅 {thisWeekSessions}</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">ses. semana</span>
          </div>
          <div className="flex-1 rounded-2xl py-2.5 px-2 text-center bg-zinc-900">
            <span className="block text-sm font-bold text-white">💪 {thisWeekVolume.toLocaleString("es-AR")}kg</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">volumen</span>
          </div>
        </div>
      </div>

      {/* B) Esta semana */}
      <div className="bg-zinc-900 rounded-3xl p-5 mb-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Esta semana</p>
        <div className="flex items-center justify-around mt-4 text-center">
          <div>
            <span className="block text-2xl font-black tabular-nums text-white">{thisWeekSessions}</span>
            <span className="block text-[11px] text-zinc-400 mt-1">entrenamientos</span>
          </div>
          <div>
            <span className="block text-2xl font-black tabular-nums text-white">{thisWeekVolume.toLocaleString("es-AR")}</span>
            <span className="block text-[11px] text-zinc-400 mt-1">volumen total</span>
          </div>
          <div>
            <span className="block text-2xl font-black tabular-nums text-white">{thisWeekMinutes}</span>
            <span className="block text-[11px] text-zinc-400 mt-1">minutos</span>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-4 pt-3 text-center">
          {isFirstWeek ? (
            <span className="text-xs text-zinc-500">Primera semana registrada 💪</span>
          ) : volumeDiff >= 0 ? (
            <span className="text-xs text-green-400">↑ +{volumeDiff.toLocaleString("es-AR")} kg vs semana anterior</span>
          ) : (
            <span className="text-xs text-red-400">↓ {volumeDiff.toLocaleString("es-AR")} kg vs semana anterior</span>
          )}
        </div>
      </div>

      {/* C) Récords personales */}
      <div className="bg-zinc-900 rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-amber-400" />
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Récords personales</p>
        </div>
        <div className="text-center py-6">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
          <p className="text-xs text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
            Completá tu primer entrenamiento para ver tus récords personales
          </p>
        </div>
      </div>

      {/* D) Mi progreso */}
      <div className="bg-zinc-900 rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-brand" />
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Mi progreso</p>
        </div>
        <div className="text-center py-6">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
          <p className="text-xs text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
            Tu historial de ejercicios aparecerá acá después de tu primera sesión
          </p>
        </div>
      </div>

      {/* E) Asistencia — sin tocar */}
      <div className="rounded-3xl p-5 mb-6 shadow-sm select-none" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: T.textPri }}>Asistencia al Gym</h4>
            <p className="text-[10px] leading-snug mt-0.5" style={{ color: T.textSec }}>Tocá el calendario para marcar entrenamiento</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="p-1 rounded-lg text-[10px] px-2 font-bold transition-all" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>◀</button>
            <span className="text-xs font-bold min-w-[80px] text-center uppercase px-2 py-1 rounded-lg" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg text-[10px] px-2 font-bold transition-all" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>▶</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase font-bold mb-2" style={{ color: T.textTer }}>
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDayOffset }).map((_, idx) => <div key={`offset-${idx}`} className="h-9 opacity-0" />)}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const pad = (n: number) => n.toString().padStart(2, "0");
            const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
            const isAttended = attendance[`gym_${dateStr}`] === true;
            const isSelected = selectedDate === dateStr;
            return (
              <motion.button
                key={`day-${dayNum}`}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleAttendance(dayNum)}
                className="h-9 w-full rounded-lg flex flex-col items-center justify-center relative transition-all"
                style={isAttended
                  ? { backgroundColor: "rgba(200,241,53,0.15)", border: `1px solid ${T.brand}`, color: T.brand, fontWeight: 700 }
                  : isSelected
                  ? { backgroundColor: T.textPri, border: `1px solid ${T.textPri}`, color: T.bg, fontWeight: 500 }
                  : { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }
                }
              >
                <span className="text-[11px]">{dayNum}</span>
                {isAttended && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
