import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { DayPlan, PausedSession } from "../../types";
import { useWakeLock } from "../../hooks/useWakeLock";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { Intro } from "./phases/Intro";
import { Exercising } from "./phases/Exercising";
import { Resting } from "./phases/Resting";
import { Transition } from "./phases/Transition";
import { Summary } from "./phases/Summary";

interface WorkoutSessionProps {
  day: DayPlan;
  onClose: () => void;
  resume?: PausedSession | null;
}

export const WorkoutSession: React.FC<WorkoutSessionProps> = ({ day, onClose, resume }) => {
  useWakeLock();

  const {
    session,
    currentBlock,
    currentExercise,
    nextExercise,
    progress,
    exerciseNumber,
    totalExercises,
    startSession,
    goToSummary,
    completeSet,
    skipExercise,
    pauseSession,
    advanceFromResting,
    advanceFromTransition,
    reorderUpcoming,
    suggestWeight,
  } = useWorkoutSession(day, resume);

  const handlePause = () => {
    const paused = pauseSession();
    if (paused) localStorage.setItem("paused_session", JSON.stringify(paused));
    onClose();
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="wait">
        {session.phase === "intro" && (
          <motion.div key="intro" className="flex-1 min-h-0">
            <Intro day={day} onStart={startSession} />
          </motion.div>
        )}

        {session.phase === "exercising" && currentBlock && currentExercise && (
          <motion.div key="exercising" className="flex-1 min-h-0 flex flex-col">
            <Exercising
              session={session}
              currentBlock={currentBlock}
              currentExercise={currentExercise}
              exerciseNumber={exerciseNumber}
              totalExercises={totalExercises}
              progress={progress}
              onCompleteSet={completeSet}
              onSkip={skipExercise}
              onReorder={reorderUpcoming}
              onAbandon={goToSummary}
              onPause={handlePause}
              onExit={onClose}
              suggestWeight={suggestWeight}
            />
          </motion.div>
        )}

        {session.phase === "resting" && currentExercise && (
          <motion.div key="resting" className="flex-1 min-h-0 flex flex-col">
            <Resting
              initialSeconds={session.restSeconds}
              currentSet={session.currentSet}
              totalSets={session.totalSets}
              currentExercise={currentExercise}
              completedSets={session.completedSets}
              isLastExercise={session.upcomingQueue.length === 0}
              onAdvance={advanceFromResting}
              onExit={onClose}
            />
          </motion.div>
        )}

        {session.phase === "transition" && currentExercise && (
          <motion.div key="transition" className="flex-1 min-h-0 flex flex-col">
            <Transition
              completedExercise={currentExercise}
              completedSets={session.completedSets}
              totalSetsForExercise={session.totalSets}
              nextExercise={nextExercise ?? null}
              isLastExercise={session.upcomingQueue.length === 0}
              onAdvance={advanceFromTransition}
            />
          </motion.div>
        )}

        {session.phase === "summary" && (
          <motion.div key="summary" className="flex-1 min-h-0 flex flex-col">
            <Summary session={session} day={day} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(content, document.body);
};
