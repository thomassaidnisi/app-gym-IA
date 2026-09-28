import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { ExerciseHistoryEntry } from "../types";
import { getExerciseHistory } from "../lib/db";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ExerciseHistoryModalProps {
  userId: string;
  exerciseName: string;
  onClose: () => void;
}

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  if (!m || !d) return dateStr;
  return `${d}/${m}`;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({ userId, exerciseName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<ExerciseHistoryEntry[]>([]);

  useEffect(() => {
    setIsLoading(true);
    getExerciseHistory(userId, exerciseName)
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, [userId, exerciseName]);

  const chartData = entries.map((e) => ({ label: formatShort(e.date), peso: e.peso }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-900 rounded-t-3xl flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-white truncate pr-4">{exerciseName}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-32 rounded-2xl bg-zinc-800" />
              <div className="h-10 rounded-xl bg-zinc-800" />
              <div className="h-10 rounded-xl bg-zinc-800" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-10">Sin registros todavía.</p>
          ) : (
            <>
              {entries.length >= 2 && (
                <div className="h-40 mb-4 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                      <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "#a1a1aa" }}
                        formatter={(value: number) => [`${value} kg`, "Peso"]}
                      />
                      <Line type="monotone" dataKey="peso" stroke="#c8f135" strokeWidth={2} dot={{ r: 3, fill: "#c8f135" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-2">
                {[...entries].reverse().map((e, i) => (
                  <div
                    key={`${e.date}-${i}`}
                    className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-white/5"
                  >
                    <span className="text-xs text-zinc-400">{e.date}</span>
                    <span className="text-sm font-semibold text-white">
                      {isNaN(e.peso) ? "—" : `${e.peso} kg`} × {e.reps || "—"} reps
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
