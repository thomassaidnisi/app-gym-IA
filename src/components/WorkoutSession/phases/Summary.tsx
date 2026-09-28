import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy } from "lucide-react";
import { SessionState, DayPlan, FullTrainingPlan, UserProfile, CompletedSet, WorkoutLog, NewPR, PRCelebrationData } from "../../../types";
import { useAuth } from "../../AuthContext";
import { saveWorkoutLog as saveWorkoutLogRemote, saveGymAttendance, saveExerciseLog, getPreviousPersonalRecords } from "../../../lib/db";
import { markDayCompleted } from "../../../lib/streak";
import { PRCelebration } from "../../PRCelebration";
import { SessionComment, SessionCommentData } from "../../SessionComment";

interface SummaryProps {
  session: SessionState;
  day: DayPlan;
  profile: UserProfile;
  plan: FullTrainingPlan;
  onProfileUpdated?: (updated: UserProfile) => void;
  onClose: () => void;
}

function getTodayStr(): string {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
}

function saveWorkoutLog(log: WorkoutLog) {
  try {
    const existing: WorkoutLog[] = JSON.parse(
      localStorage.getItem("workoutLogs") ?? "[]"
    );
    const updated = [...existing, log].slice(-30);
    localStorage.setItem("workoutLogs", JSON.stringify(updated));
  } catch {
    localStorage.setItem("workoutLogs", JSON.stringify([log]));
  }
}

function markAttendance(dateStr: string) {
  localStorage.setItem(`gym_${dateStr}`, "true");
}

function calcVolume(sets: CompletedSet[]): number {
  return sets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Lunes (YYYY-MM-DD, local) de la semana que contiene hoy. */
function getMondayStr(): string {
  const now = new Date();
  const dow = now.getDay(); // 0 = domingo
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Group CompletedSet[] by exercise name
function groupByExercise(
  sets: CompletedSet[]
): { name: string; sets: CompletedSet[] }[] {
  const order: string[] = [];
  const map: Record<string, CompletedSet[]> = {};
  for (const s of sets) {
    if (!map[s.exerciseName]) {
      order.push(s.exerciseName);
      map[s.exerciseName] = [];
    }
    map[s.exerciseName].push(s);
  }
  return order.map((name) => ({ name, sets: map[name] }));
}

// Inline editable cell
const EditableValue: React.FC<{
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}> = ({ value, onChange, inputMode = "decimal" }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange(draft.trim() || value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        inputMode={inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className="w-14 text-center rounded-lg px-1.5 py-0.5 text-xs font-bold focus:outline-none"
        style={{
          backgroundColor: "rgba(200,241,53,0.15)",
          border: "1px solid rgba(200,241,53,0.5)",
          color: "#c8f135",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      className="rounded-lg px-1.5 py-0.5 text-xs font-bold underline-offset-2 transition-opacity active:opacity-60"
      style={{ color: "#c8f135", textDecoration: "underline dotted" }}
    >
      {value}
    </button>
  );
};

export const Summary: React.FC<SummaryProps> = ({ session, day, profile, plan, onProfileUpdated, onClose }) => {
  const { user } = useAuth();
  const [editableSets, setEditableSets] = useState<CompletedSet[]>(
    session.completedSets.map((s) => ({ ...s }))
  );
  const [notes, setNotes] = useState(session.sessionNotes);
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState<PRCelebrationData | null>(null);
  const [showSessionComment, setShowSessionComment] = useState(false);
  const [sessionCommentData, setSessionCommentData] = useState<SessionCommentData | null>(null);

  const durationMs = Date.now() - new Date(session.sessionStartTime).getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  const totalVolumeKg = round1(calcVolume(editableSets));

  const uniqueExercises = new Set(editableSets.map((s) => s.exerciseName)).size;
  const totalExercisesInDay = day.blocks.reduce(
    (sum, b) => sum + b.exercises.length,
    0
  );

  const grouped = groupByExercise(editableSets);

  const updateWeight = (exerciseId: string, setNumber: number, raw: string) => {
    const parsed = parseFloat(raw.replace(",", "."));
    setEditableSets((prev) =>
      prev.map((s) =>
        s.exerciseId === exerciseId && s.setNumber === setNumber
          ? { ...s, weight: isNaN(parsed) ? s.weight : parsed }
          : s
      )
    );
  };

  const updateReps = (exerciseId: string, setNumber: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    setEditableSets((prev) =>
      prev.map((s) =>
        s.exerciseId === exerciseId && s.setNumber === setNumber
          ? { ...s, reps: isNaN(parsed) ? s.reps : parsed }
          : s
      )
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const todayStr = getTodayStr();
    const volume = round1(calcVolume(editableSets));

    const log: WorkoutLog = {
      id: `${Date.now()}`,
      date: todayStr,
      dayName: day.name,
      durationMinutes,
      totalVolumeKg: volume,
      completedSets: editableSets,
      notes,
      completedAt: new Date(),
    };

    saveWorkoutLog(log);
    markAttendance(todayStr);
    localStorage.removeItem("paused_session");

    if (user) {
      saveWorkoutLogRemote(user.id, todayStr, log)
        .then(() => console.log("WorkoutLog guardado en Supabase"))
        .catch((err) => console.error("Error guardando WorkoutLog:", err));
      saveGymAttendance(user.id, todayStr).catch(console.error);
      markDayCompleted(user.id, todayStr, profile, plan)
        .then((updated) => onProfileUpdated?.(updated))
        .catch((err) => console.error("Error actualizando racha:", err));

      // Mejor set (peso más alto) por ejercicio, para detectar PRs y alimentar exercise_logs.
      const sessionExercises = grouped
        .map((g) => {
          const withWeight = g.sets.filter((s) => s.weight !== null && s.weight > 0);
          if (withWeight.length === 0) return null;
          const best = withWeight.reduce((a, b) => ((b.weight as number) > (a.weight as number) ? b : a));
          return { name: g.name, weight: best.weight as number, reps: best.reps };
        })
        .filter((e): e is { name: string; weight: number; reps: number } => e !== null);

      let newPRs: NewPR[] = [];
      if (sessionExercises.length > 0) {
        try {
          const previousPRs = await getPreviousPersonalRecords(user.id, todayStr);
          for (const ex of sessionExercises) {
            const prev = previousPRs[ex.name] ?? null;
            if (prev === null || ex.weight > prev) {
              newPRs.push({ exerciseName: ex.name, weight: ex.weight, previousBest: prev });
            }
            saveExerciseLog(user.id, todayStr, ex.name, {
              peso: `${ex.weight} kg`,
              reps: String(ex.reps),
            }).catch(console.error);
          }
        } catch (err) {
          console.error("Error detectando récords personales:", err);
        }
      }

      const todayKey = new Date().toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase();
      const todayDesc = profile.day_descriptions?.[todayKey];
      const mondayStr = getMondayStr();
      const sessionsThisWeek = (profile.completed_days ?? []).filter(
        (d) => d >= mondayStr && d <= todayStr
      ).length;

      setSessionCommentData({
        workoutName: todayDesc?.title ?? day.name ?? "Entrenamiento",
        durationMinutes,
        totalSets: editableSets.length,
        totalVolume: volume,
        exercisesCompleted: uniqueExercises,
        newPRs: newPRs.map((pr) => pr.exerciseName),
        currentStreak: (profile.current_streak ?? 0) + 1,
        sessionsThisWeek: sessionsThisWeek + 1,
      });

      setSaving(false);
      if (newPRs.length > 0) {
        setCelebration({ prs: newPRs });
      } else {
        setShowSessionComment(true);
      }
      return;
    }
    onClose();
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              backgroundColor: "rgba(200,241,53,0.12)",
              border: "2px solid rgba(200,241,53,0.35)",
            }}
          >
            <Trophy className="w-8 h-8" style={{ color: "#c8f135" }} strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black text-white"
          >
            ¡Sesión completada!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {day.name}
          </motion.p>
        </div>

        {/* ── Stats chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { label: "Duración", value: `${durationMinutes} min` },
            { label: "Volumen", value: `${totalVolumeKg} kg` },
            {
              label: "Ejercicios",
              value: `${uniqueExercises}/${totalExercisesInDay}`,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {label}
              </span>
              <span className="text-base font-black text-white">{value}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Editable sets list ── */}
      <div className="px-5 flex-1">
        <p
          className="text-[10px] uppercase tracking-widest font-semibold mb-3"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Series registradas · tocá un valor para editar
        </p>

        <div className="space-y-3 mb-5">
          {grouped.map(({ name, sets }) => (
            <div
              key={name}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-xs font-bold text-white leading-snug">{name}</p>
              </div>
              <div className="px-4 py-2 space-y-2">
                {sets.map((s) => (
                  <div
                    key={`${s.exerciseId}-${s.setNumber}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="text-[10px] w-14 shrink-0"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Serie {s.setNumber}
                    </span>

                    <EditableValue
                      value={
                        s.weight !== null ? String(s.weight) : "—"
                      }
                      onChange={(v) =>
                        updateWeight(s.exerciseId, s.setNumber, v)
                      }
                      inputMode="decimal"
                    />
                    <span
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      kg ×
                    </span>
                    <EditableValue
                      value={String(s.reps)}
                      onChange={(v) =>
                        updateReps(s.exerciseId, s.setNumber, v)
                      }
                      inputMode="numeric"
                    />
                    <span
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      reps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Notes field ── */}
        <div className="mb-6">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold mb-2"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Notas de la sesión
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Algo que destacar de hoy?"
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.8)",
              caretColor: "#c8f135",
            }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-5 pt-4 shrink-0"
        style={{
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 rounded-2xl font-black text-base text-black disabled:opacity-70"
          style={{ backgroundColor: "#c8f135" }}
        >
          {saving ? "Guardando…" : "Guardar y terminar"}
        </motion.button>
      </div>

      <AnimatePresence>
        {celebration && (
          <PRCelebration
            data={celebration}
            onClose={() => {
              setCelebration(null);
              if (sessionCommentData) setShowSessionComment(true);
              else onClose();
            }}
          />
        )}
      </AnimatePresence>

      {showSessionComment && sessionCommentData && (
        <SessionComment
          data={sessionCommentData}
          userName={profile.name || "atleta"}
          onClose={() => { setShowSessionComment(false); onClose(); }}
        />
      )}
    </div>
  );
};
