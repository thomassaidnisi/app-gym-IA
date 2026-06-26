import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Exercise, CompletedSet } from "../../../types";

interface TransitionProps {
  completedExercise: Exercise;
  completedSets: CompletedSet[];
  totalSetsForExercise: number;
  nextExercise: Exercise | null;
  isLastExercise: boolean;
  onAdvance: () => void;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export const Transition: React.FC<TransitionProps> = ({
  completedExercise,
  completedSets,
  totalSetsForExercise,
  nextExercise,
  isLastExercise,
  onAdvance,
}) => {
  const advancedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onAdvance();
  };

  useEffect(() => {
    timerRef.current = setTimeout(advance, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Stats for the just-completed exercise
  const exSets = completedSets.filter(
    (s) => s.exerciseName === completedExercise.name
  );
  const weightsWithValues = exSets
    .map((s) => s.weight)
    .filter((w): w is number => w !== null);
  const avgWeight =
    weightsWithValues.length > 0
      ? round1(
          weightsWithValues.reduce((a, b) => a + b, 0) / weightsWithValues.length
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
      onClick={advance}
    >
      {/* Check icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 24, delay: 0.05 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: "rgba(200,241,53,0.12)", border: "2px solid rgba(200,241,53,0.3)" }}
      >
        <Check className="w-9 h-9" style={{ color: "#c8f135" }} strokeWidth={2.5} />
      </motion.div>

      {/* Completed exercise name */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-[11px] uppercase tracking-widest font-semibold mb-2"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        Completado
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.12 }}
        className="text-2xl font-black text-white leading-tight mb-3"
      >
        {completedExercise.name}
      </motion.h2>

      {/* Stats summary */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="text-sm mb-10"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        {totalSetsForExercise} series
        {avgWeight !== null ? ` · ${avgWeight} kg promedio` : ""}
      </motion.p>

      {/* Divider */}
      <div
        className="w-16 mb-10"
        style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
      />

      {/* Next exercise or final message */}
      {isLastExercise ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="flex flex-col items-center gap-2"
        >
          <p
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: "rgba(200,241,53,0.6)" }}
          >
            Último ejercicio completado
          </p>
          <p className="text-base font-bold text-white">¡Sesión terminada!</p>
        </motion.div>
      ) : (
        nextExercise && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="flex flex-col items-center gap-2"
          >
            <p
              className="text-[11px] uppercase tracking-widest font-semibold"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Siguiente
            </p>
            <p className="text-lg font-bold text-white leading-snug">
              {nextExercise.name}
            </p>
            <p
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {nextExercise.sets} series × {nextExercise.reps}
            </p>
          </motion.div>
        )
      )}

      {/* Tap hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-[10px] mt-12"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >
        Tocá en cualquier lugar para continuar
      </motion.p>
    </motion.div>
  );
};
