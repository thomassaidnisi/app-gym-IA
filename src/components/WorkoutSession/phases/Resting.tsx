import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { CompletedSet, Exercise } from "../../../types";

interface RestingProps {
  initialSeconds: number;
  currentSet: number;       // upcoming set (already incremented)
  totalSets: number;
  currentExercise: Exercise;
  completedSets: CompletedSet[];
  isLastExercise: boolean;
  onAdvance: () => void;
  onExit: () => void;
}

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function playFinishSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    // Brief silence then second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 523; // C5
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.32);
  } catch {
    // Web Audio not available
  }
}

export const Resting: React.FC<RestingProps> = ({
  initialSeconds,
  currentSet,
  totalSets,
  currentExercise,
  completedSets,
  isLastExercise,
  onAdvance,
  onExit,
}) => {
  const ringRef = useRef<SVGCircleElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const extraMsRef = useRef(0);
  const totalMsRef = useRef(initialSeconds * 1000);
  const finishedRef = useRef(false);

  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds);
  const lastDisplayRef = useRef(initialSeconds);

  // Weight used in the last completed set of this exercise
  const lastSetForEx = completedSets
    .filter((s) => s.exerciseName === currentExercise.name)
    .at(-1);
  const lastWeight = lastSetForEx?.weight ?? null;

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    playFinishSound();
    onAdvance();
  };

  const handleSkip = () => {
    cancelAnimationFrame(rafRef.current);
    onAdvance();
  };

  const handleAddTime = () => {
    extraMsRef.current += 30_000;
    const elapsed = Date.now() - startTimeRef.current;
    const total = totalMsRef.current + extraMsRef.current;
    const remaining = Math.max(0, total - elapsed);
    const secs = Math.ceil(remaining / 1000);
    lastDisplayRef.current = secs;
    setDisplaySeconds(secs);
  };

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const total = totalMsRef.current + extraMsRef.current;
      const remainingMs = Math.max(0, total - elapsed);
      const ratio = total > 0 ? remainingMs / total : 0;

      // Direct DOM update for smooth ring animation
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          CIRCUMFERENCE * (1 - ratio)
        );
      }

      // Update displayed number only on integer change
      const secs = Math.ceil(remainingMs / 1000);
      if (secs !== lastDisplayRef.current) {
        lastDisplayRef.current = secs;
        setDisplaySeconds(secs);
      }

      if (remainingMs <= 0) {
        handleFinish();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const nextLabel = isLastExercise
    ? null
    : `Serie ${currentSet} de ${totalSets}${lastWeight !== null ? ` · ${lastWeight} kg` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0">
        <button
          onClick={() => {
            console.log("[WorkoutSession] exit stub — confirmación en Parte 3");
            onExit();
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <X className="w-4 h-4 text-white" strokeWidth={2} />
        </button>

        <div className="flex-1 text-center">
          <p
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Descansando
          </p>
        </div>

        <div className="w-9 shrink-0" />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* Next step preview */}
        <div className="mb-10 text-center min-h-[20px]">
          {nextLabel && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              Próximo: {nextLabel}
            </motion.p>
          )}
        </div>

        {/* Progress ring */}
        <div className="relative flex items-center justify-center mb-10">
          <svg width="112" height="112" viewBox="0 0 112 112">
            {/* Track */}
            <circle
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="6"
            />
            {/* Progress arc */}
            <circle
              ref={ringRef}
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              stroke="#c8f135"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset="0"
              transform="rotate(-90 56 56)"
            />
          </svg>

          {/* Time inside ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-black tabular-nums leading-none"
              style={{ fontSize: 36, color: "#ffffff" }}
            >
              {displaySeconds}
            </span>
          </div>
        </div>

        {/* Exercise name reminder */}
        <p
          className="text-sm font-medium text-center max-w-[240px] leading-snug"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {currentExercise.name}
        </p>
      </div>

      {/* Footer buttons */}
      <div
        className="px-5 pt-4 shrink-0"
        style={{
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSkip}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold transition-opacity active:opacity-60"
            style={{
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Saltear descanso
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAddTime}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold transition-opacity active:opacity-60"
            style={{
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            + 30 seg
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
