import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { DayPlan } from "../../../types";
import { Clock, Dumbbell, Layers } from "lucide-react";

interface IntroProps {
  day: DayPlan;
  onStart: () => void;
}

export const Intro: React.FC<IntroProps> = ({ day, onStart }) => {
  const started = useRef(false);

  const advance = () => {
    if (started.current) return;
    started.current = true;
    onStart();
  };

  useEffect(() => {
    const t = setTimeout(advance, 2000);
    return () => clearTimeout(t);
  }, []);

  const totalExercises = day.blocks.reduce((sum, b) => sum + b.exercises.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
        style={{ backgroundColor: "rgba(200,241,53,0.12)", border: "1px solid rgba(200,241,53,0.2)" }}
      >
        <Dumbbell className="w-8 h-8" style={{ color: "#c8f135" }} strokeWidth={1.5} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-[11px] uppercase tracking-widest font-semibold mb-2"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        Entrenamiento de hoy
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.12 }}
        className="text-3xl font-black text-white leading-tight mb-2"
      >
        {day.name}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="text-sm mb-8 leading-relaxed"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {day.focus}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="flex gap-4 mb-12"
      >
        {[
          { Icon: Clock, label: day.duration },
          { Icon: Layers, label: `${day.blocks.length} bloques` },
          { Icon: Dumbbell, label: `${totalExercises} ejercicios` },
        ].map(({ Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} strokeWidth={1.5} />
            <span className="text-xs font-semibold text-white">{label}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        whileTap={{ scale: 0.97 }}
        onClick={advance}
        className="w-full max-w-xs h-14 rounded-2xl font-black text-base text-black"
        style={{ backgroundColor: "#c8f135" }}
      >
        Comenzar →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[10px] mt-4"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Comienza automáticamente en 2 s
      </motion.p>
    </motion.div>
  );
};
