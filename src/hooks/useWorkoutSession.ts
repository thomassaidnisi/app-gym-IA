import { useState } from "react";
import { DayPlan, Exercise, ExerciseBlock, SessionState, CompletedSet, WorkoutLog } from "../types";

export interface SuggestedWeight {
  weight: number;
  progressionSuggested: boolean;
  lastWeight: number | null;
  lastSetsCompleted: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePlanWeight(str: string): number {
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function loadWorkoutLogs(): WorkoutLog[] {
  try {
    return JSON.parse(localStorage.getItem("workoutLogs") ?? "[]");
  } catch {
    return [];
  }
}

function getRestSeconds(block: ExerciseBlock, exercise: Exercise): number {
  if (exercise.rest_seconds > 0) return exercise.rest_seconds;
  if (block.is_superset) return 45;
  const t = block.type.toLowerCase();
  if (t.includes("strength") || t.includes("fuerza")) return 90;
  if (t.includes("hypertrophy") || t.includes("hipertrofia")) return 60;
  return 60;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkoutSession(day: DayPlan) {
  const firstBlock = day.blocks[0];
  const firstExercise = firstBlock?.exercises[0];

  const [session, setSession] = useState<SessionState>({
    phase: "intro",
    currentBlockIndex: 0,
    currentExerciseIndex: 0,
    currentSet: 1,
    totalSets: firstExercise?.sets ?? 1,
    restSeconds: firstExercise ? getRestSeconds(firstBlock, firstExercise) : 60,
    restRemaining: 0,
    completedSets: [],
    sessionStartTime: new Date(),
    sessionNotes: "",
    isLastExercise: false,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentBlock = day.blocks[session.currentBlockIndex];
  const currentExercise = currentBlock?.exercises[session.currentExerciseIndex];

  const allExercises = day.blocks.flatMap((b) => b.exercises);
  const exercisesDoneCount =
    day.blocks
      .slice(0, session.currentBlockIndex)
      .reduce((sum, b) => sum + b.exercises.length, 0) +
    session.currentExerciseIndex;

  const exerciseNumber = exercisesDoneCount + 1;
  const totalExercises = allExercises.length;
  const progress =
    totalExercises > 0
      ? (exercisesDoneCount + (session.currentSet - 1) / Math.max(session.totalSets, 1)) /
        totalExercises
      : 0;

  // Next exercise (valid during transition phase)
  const nextExercise = (() => {
    if (session.isLastExercise) return null;
    const block = day.blocks[session.currentBlockIndex];
    const isLastInBlock =
      session.currentExerciseIndex === (block?.exercises.length ?? 0) - 1;
    const nextBI = isLastInBlock
      ? session.currentBlockIndex + 1
      : session.currentBlockIndex;
    const nextEI = isLastInBlock ? 0 : session.currentExerciseIndex + 1;
    return day.blocks[nextBI]?.exercises[nextEI] ?? null;
  })();

  // ── Public actions ─────────────────────────────────────────────────────────

  const startSession = () => {
    setSession((s) => ({ ...s, phase: "exercising" }));
  };

  const completeSet = (weight: number | null, reps: number) => {
    setSession((s) => {
      const block = day.blocks[s.currentBlockIndex];
      const exercise = block?.exercises[s.currentExerciseIndex];
      if (!block || !exercise) return s;

      const newCompletedSet: CompletedSet = {
        exerciseId: `${s.currentBlockIndex}-${s.currentExerciseIndex}`,
        exerciseName: exercise.name,
        setNumber: s.currentSet,
        weight,
        reps,
        completedAt: new Date(),
      };
      const completedSets = [...s.completedSets, newCompletedSet];

      if (s.currentSet < s.totalSets) {
        // More sets for this exercise → rest
        const restSecs = getRestSeconds(block, exercise);
        return {
          ...s,
          completedSets,
          currentSet: s.currentSet + 1,
          restSeconds: restSecs,
          restRemaining: restSecs,
          phase: "resting" as const,
        };
      }

      // Last set → transition
      const isLastInBlock =
        s.currentExerciseIndex === block.exercises.length - 1;
      const isLastBlock = s.currentBlockIndex === day.blocks.length - 1;
      const isLast = isLastInBlock && isLastBlock;

      return {
        ...s,
        completedSets,
        phase: "transition" as const,
        isLastExercise: isLast,
      };
    });
  };

  const advanceFromResting = () => {
    setSession((s) => ({ ...s, phase: "exercising" as const, restRemaining: 0 }));
  };

  const addRestTime = (seconds: number) => {
    setSession((s) => ({ ...s, restRemaining: s.restRemaining + seconds }));
  };

  const advanceFromTransition = () => {
    setSession((s) => {
      if (s.isLastExercise) {
        return { ...s, phase: "summary" as const };
      }

      const block = day.blocks[s.currentBlockIndex];
      const isLastInBlock =
        s.currentExerciseIndex === (block?.exercises.length ?? 0) - 1;

      const nextBI = isLastInBlock
        ? s.currentBlockIndex + 1
        : s.currentBlockIndex;
      const nextEI = isLastInBlock ? 0 : s.currentExerciseIndex + 1;

      const nextBlock = day.blocks[nextBI];
      const nextEx = nextBlock?.exercises[nextEI];
      if (!nextBlock || !nextEx) return { ...s, phase: "summary" as const };

      return {
        ...s,
        phase: "exercising" as const,
        currentBlockIndex: nextBI,
        currentExerciseIndex: nextEI,
        currentSet: 1,
        totalSets: nextEx.sets,
        restSeconds: getRestSeconds(nextBlock, nextEx),
        restRemaining: 0,
        isLastExercise: false,
      };
    });
  };

  const suggestWeight = (
    exerciseName: string,
    planWeightStr: string
  ): SuggestedWeight => {
    const logs = loadWorkoutLogs();
    for (let i = logs.length - 1; i >= 0; i--) {
      const sets = logs[i].completedSets.filter(
        (s) => s.exerciseName === exerciseName
      );
      if (sets.length === 0) continue;

      const weights = sets
        .map((s) => s.weight)
        .filter((w): w is number => w !== null);
      if (weights.length === 0) break;

      const lastWeight = weights[weights.length - 1];
      const setsCompleted = sets.length;

      if (setsCompleted >= session.totalSets) {
        return {
          weight: lastWeight + 2.5,
          progressionSuggested: true,
          lastWeight,
          lastSetsCompleted: setsCompleted,
        };
      }
      return {
        weight: lastWeight,
        progressionSuggested: false,
        lastWeight,
        lastSetsCompleted: setsCompleted,
      };
    }

    return {
      weight: parsePlanWeight(planWeightStr),
      progressionSuggested: false,
      lastWeight: null,
      lastSetsCompleted: null,
    };
  };

  return {
    session,
    currentBlock,
    currentExercise,
    nextExercise,
    progress,
    exerciseNumber,
    totalExercises,
    startSession,
    completeSet,
    advanceFromResting,
    addRestTime,
    advanceFromTransition,
    suggestWeight,
  };
}
