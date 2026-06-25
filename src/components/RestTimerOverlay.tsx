import React from "react";
import { useRestTimer } from "./RestTimerContext";
import { Play, Pause, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
};

export const RestTimerOverlay: React.FC = () => {
  const { isActive, timeLeft, duration, label, isOpen, pauseTimer, resumeTimer, closeTimer } =
    useRestTimer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    duration > 0 ? circumference - (timeLeft / duration) * circumference : circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div
            className="backdrop-blur-md shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
          >
            {/* Progress ring */}
            <div className="relative shrink-0">
              <svg width="40" height="40" className="transform -rotate-90">
                <circle
                  cx="20" cy="20" r={radius}
                  stroke="var(--border)" strokeWidth="3" fill="transparent"
                />
                <circle
                  cx="20" cy="20" r={radius}
                  className="stroke-brand transition-all duration-1000 ease-linear"
                  strokeWidth="3" fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold tabular-nums" style={{ color: T.textPri }}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Label */}
            <span className="text-sm truncate flex-1 min-w-0" style={{ color: T.textSec }} id="timer-label">
              {label || "Descanso"}
            </span>

            {/* Time display */}
            <span
              className="font-bold text-lg tabular-nums shrink-0"
              style={{ color: T.textPri }}
              id="timer-display"
            >
              {formatTime(timeLeft)}
            </span>

            {/* Play/Pause */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isActive ? pauseTimer : resumeTimer}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isActive ? "" : "bg-brand hover:bg-lime-400"
              }`}
              style={isActive ? { backgroundColor: T.bgSec, border: `1px solid ${T.border}` } : {}}
              id="play-pause-timer-btn"
            >
              {isActive ? (
                <Pause
                  className="w-3.5 h-3.5 fill-[var(--text-primary)]"
                  style={{ color: T.textPri }}
                />
              ) : (
                <Play className="w-3.5 h-3.5 text-black fill-black" />
              )}
            </motion.button>

            {/* Close */}
            <button
              onClick={closeTimer}
              className="shrink-0 transition-colors hover:text-[var(--text-secondary)]"
              style={{ color: T.textTer }}
              id="close-timer-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
