import { useState } from "react";
import { DayPlan, Exercise, ExerciseBlock, QueueItem, SessionState, CompletedSet, WorkoutLog, PausedSession } from "../types";

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

function buildQueue(day: DayPlan): QueueItem[] {
  return day.blocks.flatMap((block, bi) =>
    block.exercises.map((exercise, ei) => ({
      id: `b${bi}-e${ei}`,
      exercise,
      block,
    }))
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkoutSession(day: DayPlan, resume?: PausedSession | null) {
  const queue = buildQueue(day);
  const [head, ...tail] = queue;

  const buildInitialSession = (): SessionState => {
    if (resume) {
      const byId = new Map(queue.map((q) => [q.id, q]));
      const currentItem = byId.get(resume.currentItemId) ?? head ?? null;
      const upcomingQueue = resume.upcomingQueueIds
        .map((id) => byId.get(id))
        .filter((item): item is QueueItem => !!item);
      const completedQueue = resume.completedQueueIds
        .map((id) => byId.get(id))
        .filter((item): item is QueueItem => !!item);
      return {
        phase: "exercising",
        completedQueue,
        currentItem,
        upcomingQueue,
        currentSet: resume.currentSet,
        totalSets: resume.totalSets,
        restSeconds: currentItem ? getRestSeconds(currentItem.block, currentItem.exercise) : 60,
        restRemaining: 0,
        completedSets: resume.completedSets.map((s) => ({ ...s, completedAt: new Date(s.completedAt) })),
        sessionStartTime: new Date(resume.sessionStartTime),
        sessionNotes: "",
      };
    }
    return {
      phase: "intro",
      completedQueue: [],
      currentItem: head ?? null,
      upcomingQueue: tail,
      currentSet: 1,
      totalSets: head?.exercise.sets ?? 1,
      restSeconds: head ? getRestSeconds(head.block, head.exercise) : 60,
      restRemaining: 0,
      completedSets: [],
      sessionStartTime: new Date(),
      sessionNotes: "",
    };
  };

  const [session, setSession] = useState<SessionState>(buildInitialSession);

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentBlock = session.currentItem?.block ?? null;
  const currentExercise = session.currentItem?.exercise ?? null;
  const nextExercise = session.upcomingQueue[0]?.exercise ?? null;

  const totalExercises =
    session.completedQueue.length +
    (session.currentItem ? 1 : 0) +
    session.upcomingQueue.length;

  const exerciseNumber = session.completedQueue.length + 1;

  const progress =
    totalExercises > 0
      ? (session.completedQueue.length +
          (session.currentSet - 1) / Math.max(session.totalSets, 1)) /
        totalExercises
      : 0;

  // ── Public actions ─────────────────────────────────────────────────────────

  const startSession = () => {
    setSession((s) => ({ ...s, phase: "exercising" }));
  };

  const completeSet = (weight: number | null, reps: number) => {
    setSession((s) => {
      if (!s.currentItem) return s;
      const { exercise, block, id } = s.currentItem;

      const newSet: CompletedSet = {
        exerciseId: id,
        exerciseName: exercise.name,
        setNumber: s.currentSet,
        weight,
        reps,
        completedAt: new Date(),
      };
      const completedSets = [...s.completedSets, newSet];

      if (s.currentSet < s.totalSets) {
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

      // Last set of this exercise — push to completedQueue, go to transition.
      // upcomingQueue.length === 0 means this was the last exercise.
      return {
        ...s,
        completedSets,
        completedQueue: [...s.completedQueue, s.currentItem],
        phase: "transition" as const,
      };
    });
  };

  const goToSummary = () => {
    setSession((s) => ({ ...s, phase: "summary" as const }));
  };

  const advanceFromResting = () => {
    setSession((s) => ({ ...s, phase: "exercising" as const, restRemaining: 0 }));
  };

  const addRestTime = (seconds: number) => {
    setSession((s) => ({ ...s, restRemaining: s.restRemaining + seconds }));
  };

  const advanceFromTransition = () => {
    setSession((s) => {
      const [next, ...remaining] = s.upcomingQueue;
      if (!next) return { ...s, phase: "summary" as const };

      return {
        ...s,
        phase: "exercising" as const,
        currentItem: next,
        upcomingQueue: remaining,
        currentSet: 1,
        totalSets: next.exercise.sets,
        restSeconds: getRestSeconds(next.block, next.exercise),
        restRemaining: 0,
      };
    });
  };

  /** Skip the current exercise entirely — no sets are recorded, it never enters completedQueue. */
  const skipExercise = () => {
    setSession((s) => {
      if (!s.currentItem) return s;
      const [next, ...remaining] = s.upcomingQueue;
      if (!next) return { ...s, phase: "summary" as const };

      return {
        ...s,
        phase: "exercising" as const,
        currentItem: next,
        upcomingQueue: remaining,
        currentSet: 1,
        totalSets: next.exercise.sets,
        restSeconds: getRestSeconds(next.block, next.exercise),
        restRemaining: 0,
      };
    });
  };

  /** Snapshot the current progress so it can be restored later via the `resume` param. */
  const pauseSession = (): PausedSession | null => {
    if (!session.currentItem) return null;
    return {
      dayName: day.name,
      currentItemId: session.currentItem.id,
      upcomingQueueIds: session.upcomingQueue.map((item) => item.id),
      completedQueueIds: session.completedQueue.map((item) => item.id),
      currentSet: session.currentSet,
      totalSets: session.totalSets,
      completedSets: session.completedSets,
      sessionStartTime: session.sessionStartTime.toISOString(),
      pausedAt: Date.now(),
    };
  };

  /**
   * Reorder upcoming exercises by providing the desired sequence of IDs.
   * Any ID not present in newIds is appended at the end unchanged.
   * The current exercise is never affected.
   */
  const reorderUpcoming = (newIds: string[]) => {
    setSession((s) => {
      const map = new Map(s.upcomingQueue.map((item) => [item.id, item]));
      const reordered = newIds.flatMap((id) => {
        const item = map.get(id);
        return item ? [item] : [];
      });
      const mentioned = new Set(newIds);
      const remainder = s.upcomingQueue.filter((item) => !mentioned.has(item.id));
      return { ...s, upcomingQueue: [...reordered, ...remainder] };
    });
  };

  const suggestWeight = (
    exerciseName: string,
    planWeightStr: string
  ): SuggestedWeight => {
    const logs = loadWorkoutLogs();
    for (let i = logs.length - 1; i >= 0; i--) {
      const sets = logs[i].completedSets.filter(
        (s: CompletedSet) => s.exerciseName === exerciseName
      );
      if (sets.length === 0) continue;

      const weights = sets
        .map((s: CompletedSet) => s.weight)
        .filter((w: number | null): w is number => w !== null);
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
    goToSummary,
    completeSet,
    skipExercise,
    pauseSession,
    advanceFromResting,
    addRestTime,
    advanceFromTransition,
    reorderUpcoming,
    suggestWeight,
  };
}
