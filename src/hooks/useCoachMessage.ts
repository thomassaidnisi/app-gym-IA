import { useEffect, useState } from "react";
import { UserProfile, DailyCheckinData } from "../types";
import { localDateStr } from "../lib/date";

function getMondayStr(): string {
  const now = new Date();
  const dow = now.getDay(); // 0 = domingo
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return localDateStr(monday);
}

export function useCoachMessage(profile: UserProfile, todayCheckin: DailyCheckinData | null) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const today = localDateStr();
    const cached = localStorage.getItem("coach_daily_message");
    const cachedDate = localStorage.getItem("coach_daily_message_date");

    if (cached && cachedDate === today) {
      setMessage(cached);
      return;
    }

    const generate = async () => {
      setIsLoading(true);
      try {
        const todayKey = new Date().toLocaleDateString("es-AR", { weekday: "long" }).toLowerCase();
        const todayDesc = profile.day_descriptions?.[todayKey];
        const completedDays = profile.completed_days ?? [];
        const lastSessionDate = completedDays.length > 0
          ? [...completedDays].sort().reverse()[0]
          : null;
        const mondayStr = getMondayStr();
        const sessionsThisWeek = completedDays.filter((d) => d >= mondayStr && d <= today).length;

        const res = await fetch("/api/coach-daily-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: profile.name || "atleta",
            todayType: todayDesc?.type ?? "descanso",
            todayTitle: todayDesc?.title ?? "Descanso",
            currentStreak: profile.current_streak ?? 0,
            sessionsThisWeek,
            lastSessionDate,
            readinessScore: todayCheckin?.readinessScore ?? null,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setMessage(data.message);
          localStorage.setItem("coach_daily_message", data.message);
          localStorage.setItem("coach_daily_message_date", today);
        }
      } catch {
        // Silencioso — si falla, simplemente no se muestra el card.
      } finally {
        setIsLoading(false);
      }
    };

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  return { message, isLoading };
}
