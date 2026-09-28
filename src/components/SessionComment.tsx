import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";

export interface SessionCommentData {
  workoutName: string;
  durationMinutes: number;
  totalSets: number;
  totalVolume: number;
  exercisesCompleted: number;
  newPRs: string[];
  currentStreak: number;
  sessionsThisWeek: number;
}

interface SessionCommentProps {
  data: SessionCommentData;
  userName: string;
  onClose: () => void;
}

export const SessionComment: React.FC<SessionCommentProps> = ({ data, userName, onClose }) => {
  const [comment, setComment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) { done = true; onClose(); }
    }, 8000);

    fetch("/api/session-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, ...data }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (done) return;
        clearTimeout(timeout);
        if (json.comment) {
          setComment(json.comment);
          setIsLoading(false);
        } else {
          done = true;
          onClose();
        }
      })
      .catch(() => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        onClose();
      });

    return () => { done = true; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!comment && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="bg-zinc-900 rounded-3xl mx-4 p-6"
      >
        <MessageSquare size={20} className="text-lime-400" />
        <p className="text-xs uppercase tracking-widest text-zinc-500 mt-3">Tu coach</p>

        {isLoading ? (
          <div className="mt-2 space-y-2">
            <div className="h-4 rounded bg-zinc-800 animate-pulse w-full" />
            <div className="h-4 rounded bg-zinc-800 animate-pulse w-5/6" />
            <div className="h-4 rounded bg-zinc-800 animate-pulse w-2/3" />
          </div>
        ) : (
          <p className="text-white text-base leading-relaxed mt-2">{comment}</p>
        )}

        <button
          onClick={onClose}
          className="bg-zinc-800 text-white rounded-2xl py-3 w-full mt-4"
        >
          Cerrar
        </button>
      </motion.div>
    </div>
  );
};
