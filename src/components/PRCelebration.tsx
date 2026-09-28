import React, { useEffect } from "react";
import { motion } from "motion/react";
import { PRCelebrationData } from "../types";

interface PRCelebrationProps {
  data: PRCelebrationData;
  onClose: () => void;
}

export const PRCelebration: React.FC<PRCelebrationProps> = ({ data, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSingle = data.prs.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6 bg-zinc-900"
        style={{ border: "1px solid rgba(200,241,53,0.3)" }}
      >
        <div className="text-center">
          <span className="text-5xl block mb-2">🏆</span>
          <h2 className="text-xl font-black text-white">
            {isSingle ? "¡Nuevo récord!" : `¡${data.prs.length} nuevos récords!`}
          </h2>
        </div>

        <div className="mt-5 space-y-2 max-h-64 overflow-y-auto">
          {data.prs.map((pr) => (
            <div
              key={pr.exerciseName}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white/5"
            >
              <span className="text-sm font-semibold text-white truncate pr-2">{pr.exerciseName}</span>
              <div className="text-right shrink-0">
                <span className="text-sm font-black text-brand tabular-nums">{pr.weight} kg</span>
                <span className="block text-[10px] text-zinc-500">
                  {pr.previousBest === null
                    ? "¡Primera vez!"
                    : `+${(pr.weight - pr.previousBest).toFixed(1)}kg vs anterior`}
                </span>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="w-full h-12 rounded-2xl font-black text-base text-black mt-6"
          style={{ backgroundColor: "#c8f135" }}
        >
          ¡Genial!
        </motion.button>
      </motion.div>
    </div>
  );
};
