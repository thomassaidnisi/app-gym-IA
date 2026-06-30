import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Minus, Plus, ListOrdered } from "lucide-react";
import { ExerciseBlock, Exercise, SessionState } from "../../../types";
import { SuggestedWeight } from "../../../hooks/useWorkoutSession";
import { QueueSheet } from "../QueueSheet";
import { TechniqueSheet } from "../TechniqueSheet";
import { ExitSheet } from "../ExitSheet";

interface ExercisingProps {
  session: SessionState;
  currentBlock: ExerciseBlock;
  currentExercise: Exercise;
  exerciseNumber: number;
  totalExercises: number;
  progress: number;
  onCompleteSet: (weight: number | null, reps: number) => void;
  onReorder: (newIds: string[]) => void;
  onAbandon: () => void;
  onExit: () => void;
  suggestWeight: (name: string, planWeight: string) => SuggestedWeight;
}

function parseReps(repsStr: string): number {
  const match = repsStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 10;
}

export const Exercising: React.FC<ExercisingProps> = ({
  session,
  currentBlock,
  currentExercise,
  exerciseNumber,
  totalExercises,
  progress,
  onCompleteSet,
  onReorder,
  onAbandon,
  onExit,
  suggestWeight,
}) => {
  const [showQueue, setShowQueue] = useState(false);
  const [showTechnique, setShowTechnique] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const suggestion = suggestWeight(currentExercise.name, currentExercise.weight);
  const [weight, setWeight] = useState(suggestion.weight);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState(String(suggestion.weight));
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset weight when exercise changes
  useEffect(() => {
    const s = suggestWeight(currentExercise.name, currentExercise.weight);
    setWeight(s.weight);
    setInputValue(String(s.weight));
    setShowInput(false);
  }, [currentExercise.name]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const adjust = (delta: number) => {
    const next = Math.max(0, parseFloat((weight + delta).toFixed(1)));
    setWeight(next);
    setInputValue(String(next));
  };

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => setShowInput(true), 500);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const commitInput = () => {
    const parsed = parseFloat(inputValue.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) setWeight(parsed);
    else setInputValue(String(weight));
    setShowInput(false);
  };

  const blockLabel = currentBlock.title || currentBlock.label || "Bloque";

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>

      {/* ── PROGRESS BAR ── */}
      <div className="h-0.5" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: "#c8f135" }}
          animate={{ width: `${Math.max(2, progress * 100)}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0">
        <button
          onClick={() => setShowExit(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <X className="w-4 h-4 text-white" strokeWidth={2} />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold truncate"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Ejercicio {exerciseNumber} de {totalExercises} · {blockLabel}
          </p>
          <h2 className="text-sm font-bold text-white leading-snug line-clamp-1 mt-0.5">
            {currentExercise.name}
          </h2>
        </div>

        {/* Queue button */}
        {session.upcomingQueue.length > 0 ? (
          <button
            onClick={() => setShowQueue(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity active:opacity-60"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            aria-label="Ver cola de ejercicios"
          >
            <ListOrdered className="w-4 h-4 text-white" strokeWidth={2} />
          </button>
        ) : (
          <div className="w-9 shrink-0" />
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">

        {/* Serie counter */}
        <p
          className="text-[10px] uppercase tracking-widest font-semibold mb-3"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Serie
        </p>
        <div className="flex items-end gap-2 mb-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={session.currentSet}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="text-9xl font-black text-white tabular-nums leading-none"
            >
              {session.currentSet}
            </motion.span>
          </AnimatePresence>
          <span
            className="text-4xl font-light mb-4 tabular-nums"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            /{session.totalSets}
          </span>
        </div>

        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
          {currentExercise.reps} reps objetivo
        </p>

        {/* ── WEIGHT ZONE ── */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-6">

            {/* −2.5 */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => adjust(-2.5)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-opacity active:opacity-60"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Minus className="w-5 h-5 text-white" strokeWidth={2} />
            </motion.button>

            {/* Weight display / input */}
            <div
              className="flex items-end gap-1.5 cursor-pointer select-none"
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
            >
              <AnimatePresence mode="wait">
                {showInput ? (
                  <motion.input
                    key="input"
                    ref={inputRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    type="number"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={commitInput}
                    onKeyDown={(e) => { if (e.key === "Enter") commitInput(); }}
                    className="font-black text-center tabular-nums bg-transparent focus:outline-none"
                    style={{
                      fontSize: 48,
                      color: "#c8f135",
                      width: "4ch",
                      lineHeight: 1,
                      caretColor: "#c8f135",
                    }}
                  />
                ) : (
                  <motion.span
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-black tabular-nums leading-none"
                    style={{ fontSize: 48, color: "#c8f135" }}
                  >
                    {weight % 1 === 0 ? weight : weight.toFixed(1)}
                  </motion.span>
                )}
              </AnimatePresence>
              <span
                className="text-xl font-semibold mb-1.5"
                style={{ color: "rgba(200,241,53,0.4)" }}
              >
                kg
              </span>
            </div>

            {/* +2.5 */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => adjust(+2.5)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-opacity active:opacity-60"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={2} />
            </motion.button>

          </div>

          {/* Historial */}
          {suggestion.lastWeight !== null && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-center"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              Última vez: {suggestion.lastWeight} kg · {suggestion.lastSetsCompleted} series
              {suggestion.progressionSuggested && (
                <span style={{ color: "rgba(200,241,53,0.55)" }}> · ↑ progresión sugerida</span>
              )}
            </motion.p>
          )}

          {!showInput && (
            <p
              className="text-[10px] mt-1"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              Mantené presionado el peso para editar
            </p>
          )}
        </div>
      </div>

      {/* ── NEXT UP ── */}
      {session.upcomingQueue.length > 0 && (
        <div className="px-5 pb-3 shrink-0 text-center">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
            Siguiente:{" "}
            <span className="font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
              {session.upcomingQueue[0].exercise.name}
            </span>
            {session.upcomingQueue[0].block.is_superset && (
              <span style={{ color: "rgba(255,255,255,0.22)" }}> · superserie</span>
            )}
          </p>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        className="px-5 pb-8 pt-4 shrink-0 space-y-3"
        style={{
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onCompleteSet(weight, parseReps(currentExercise.reps))}
          className="w-full h-14 rounded-2xl font-black text-base text-black"
          style={{ backgroundColor: "#c8f135" }}
        >
          Terminé la serie ✓
        </motion.button>

        <button
          onClick={() => setShowTechnique(true)}
          className="w-full h-10 rounded-xl text-sm font-semibold transition-opacity active:opacity-60"
          style={{
            color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Ver técnica
        </button>
      </div>
      <QueueSheet
        isOpen={showQueue}
        items={session.upcomingQueue}
        onConfirm={onReorder}
        onClose={() => setShowQueue(false)}
      />
      <TechniqueSheet
        isOpen={showTechnique}
        exercise={currentExercise}
        onClose={() => setShowTechnique(false)}
      />
      <ExitSheet
        isOpen={showExit}
        onContinue={() => setShowExit(false)}
        onAbandon={onAbandon}
      />
    </div>
  );
};
