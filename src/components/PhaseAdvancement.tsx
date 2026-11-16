import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { FullTrainingPlan, PlanPhase } from "../types";

interface PhaseAdvancementProps {
  plan: FullTrainingPlan;
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}

export const PhaseAdvancement: React.FC<PhaseAdvancementProps> = ({ plan, onConfirm, onDismiss }) => {
  const [loading, setLoading] = useState(false);

  const currentPhaseNum = plan.current_phase ?? 1;
  const nextPhaseNum = currentPhaseNum + 1;
  const totalPhases = plan.total_phases ?? (plan.phases?.length ?? 1);

  const currentPhase = plan.phases?.find((p) => p.phase_number === currentPhaseNum);
  const nextPhase = plan.phases?.find((p) => p.phase_number === nextPhaseNum);

  if (!nextPhase) return null;

  // Build a list of exercise changes per day
  const changes: { dayName: string; from: string[]; to: string[] }[] = [];
  if (currentPhase && nextPhase) {
    nextPhase.days.forEach((nextDay, i) => {
      const currentDay = currentPhase.days[i];
      if (!currentDay) return;

      const nextExercises = nextDay.blocks.flatMap((b) => b.exercises.map((e) => e.name));
      const currentExercises = currentDay.blocks.flatMap((b) => b.exercises.map((e) => e.name));

      const changed = nextExercises.some((name, idx) => name !== currentExercises[idx]);
      if (changed) {
        changes.push({ dayName: nextDay.name, from: currentExercises, to: nextExercises });
      }
    });
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-zinc-900 pb-safe"
        style={{ border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="mx-auto mb-1 w-10 h-1 rounded-full bg-zinc-700" />
          <div className="mt-4 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-brand) 15%, transparent)" }}
            >
              <Sparkles size={22} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Progresión</p>
              <h2 className="text-lg font-black text-white leading-tight">
                Tiempo de avanzar a la Fase {nextPhaseNum}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Completaste {currentPhaseNum === 1 ? "las primeras 4 semanas" : `la fase ${currentPhaseNum}`}. Los ejercicios
            evolucionan para seguir progresando — mismos días, mayor exigencia.
          </p>
        </div>

        {/* Phase counter */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <React.Fragment key={i}>
                <div
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    backgroundColor:
                      i + 1 <= currentPhaseNum
                        ? "color-mix(in srgb, var(--color-brand) 60%, transparent)"
                        : i + 1 === nextPhaseNum
                        ? "var(--color-brand)"
                        : "rgba(255,255,255,0.1)",
                  }}
                />
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-zinc-500">Fase {currentPhaseNum}</span>
            <span className="text-[11px] text-brand font-semibold">Fase {nextPhaseNum}</span>
            {totalPhases > nextPhaseNum && (
              <span className="text-[11px] text-zinc-600">Fase {totalPhases}</span>
            )}
          </div>
        </div>

        {/* Changes list */}
        {changes.length > 0 && (
          <div className="px-6 mb-5 space-y-3 max-h-48 overflow-y-auto">
            {changes.map((change) => (
              <div key={change.dayName}>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide mb-1.5">
                  {change.dayName}
                </p>
                <div className="space-y-1">
                  {change.to.map((exName, idx) => {
                    const fromName = change.from[idx];
                    const isNew = exName !== fromName;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {isNew ? (
                          <>
                            <span className="text-zinc-500 line-through truncate max-w-[40%]">{fromName}</span>
                            <ArrowRight size={12} className="text-zinc-500 shrink-0" />
                            <span className="text-white font-semibold truncate">{exName}</span>
                          </>
                        ) : (
                          <span className="text-zinc-400 truncate">{exName}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-14 rounded-2xl font-black text-base text-black flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            {loading ? (
              <span className="animate-pulse">Actualizando plan...</span>
            ) : (
              <>
                Avanzar a Fase {nextPhaseNum}
                <ChevronRight size={18} strokeWidth={3} />
              </>
            )}
          </motion.button>
          <button
            onClick={onDismiss}
            className="w-full h-11 rounded-2xl text-sm font-semibold text-zinc-400"
          >
            Más adelante
          </button>
        </div>
      </motion.div>
    </div>
  );
};
