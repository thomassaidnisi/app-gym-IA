export function calculateReadinessScore(
  sleepHours: number,    // 4-8+
  energyLevel: number,   // 1-5
  muscleSoreness: number // 1=muy cargado, 5=fresco
): number {
  const sleepScore = Math.min(sleepHours, 8) / 8; // normalizado 0-1
  const energyScore = energyLevel / 5;
  const sorenessScore = muscleSoreness / 5;
  const raw = (sleepScore * 35) + (energyScore * 40) + (sorenessScore * 25);
  return Math.round(raw);
}

export function getReadinessInfo(score: number): {
  label: string;
  message: string;
  color: string; // clase tailwind
} {
  if (score >= 85) return {
    label: "Óptimo",
    message: "Estás en tu mejor momento. Día ideal para dar todo.",
    color: "text-brand",
  };
  if (score >= 65) return {
    label: "Bueno",
    message: "Llegás bien hoy. Entrenamiento normal.",
    color: "text-blue-400",
  };
  if (score >= 45) return {
    label: "Regular",
    message: "Llegás algo justo. Escuchá tu cuerpo durante la sesión.",
    color: "text-amber-400",
  };
  return {
    label: "Bajo",
    message: "Tu cuerpo pide recuperación. Considerá una sesión liviana hoy.",
    color: "text-red-400",
  };
}
