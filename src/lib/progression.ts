import { ProgressionSuggestion } from "../types";

interface ExerciseLogEntry {
  date: string;
  exercise_name: string;
  peso?: string;
  reps?: string;
}

export function getProgressionSuggestions(logs: ExerciseLogEntry[]): ProgressionSuggestion[] {
  const byExercise: Record<string, ExerciseLogEntry[]> = {};
  for (const log of logs) {
    if (!byExercise[log.exercise_name]) byExercise[log.exercise_name] = [];
    byExercise[log.exercise_name].push(log);
  }

  const suggestions: ProgressionSuggestion[] = [];

  for (const [exercise, entries] of Object.entries(byExercise)) {
    if (entries.length < 3) continue;

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const [latest, second] = sorted;

    if (!latest.peso || !latest.reps) continue;
    if (latest.peso !== second.peso || latest.reps !== second.reps) continue;

    let sessionsStuck = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].peso === latest.peso && sorted[i].reps === latest.reps) {
        sessionsStuck++;
      } else {
        break;
      }
    }
    if (sessionsStuck < 2) continue;

    suggestions.push({
      exercise,
      currentWeight: latest.peso,
      currentReps: latest.reps,
      sessionsStuck,
      message: `Llevas ${sessionsStuck} sesiones con ${latest.peso} × ${latest.reps} reps en ${exercise}. Es momento de subir la carga.`,
    });
  }

  return suggestions;
}
