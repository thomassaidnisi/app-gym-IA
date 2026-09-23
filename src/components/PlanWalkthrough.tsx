import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlanPillar } from "../types";
import { useAuth } from "./AuthContext";
import { markWalkthroughSeen } from "../lib/db";

interface PlanWalkthroughProps {
  pillars: PlanPillar[];
  onClose: () => void;
}

export const PlanWalkthrough: React.FC<PlanWalkthroughProps> = ({ pillars, onClose }) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const isLast = index === pillars.length - 1;
  const pillar = pillars[index];

  const handleFinish = async () => {
    setFinishing(true);
    if (user) await markWalkthroughSeen(user.id).catch(console.error);
    onClose();
  };

  if (!pillar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="w-full max-w-lg bg-white rounded-t-3xl flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 px-6 pt-6 shrink-0">
          {pillars.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= index ? "#c8f135" : "#3f3f46" }}
            />
          ))}
        </div>

        <div className="px-6 pt-5 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8bb800" }}>
            Tus pilares personalizados
          </p>
          <div className="flex items-start justify-between gap-3 mt-2">
            <AnimatePresence mode="wait">
              <motion.h2
                key={index}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="text-3xl font-extrabold text-black leading-tight"
              >
                {pillar.nombre}
              </motion.h2>
            </AnimatePresence>
            <span className="shrink-0 mt-1 bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
              {pillar.frecuencia}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: "#3f3f46" }}
            >
              {pillar.descripcion}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 px-6 pb-8 pt-4 shrink-0 border-t border-zinc-100">
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="text-sm font-semibold text-zinc-500 px-2 transition-opacity active:opacity-60"
            >
              Anterior
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => (isLast ? handleFinish() : setIndex((i) => i + 1))}
            disabled={finishing}
            className="flex-1 h-14 rounded-2xl font-black text-base text-black disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: "#c8f135" }}
          >
            {isLast ? "Entendido" : "Siguiente"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
