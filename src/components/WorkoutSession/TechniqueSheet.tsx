import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Youtube, AlertTriangle, Lightbulb } from "lucide-react";
import { Exercise } from "../../types";

interface TechniqueSheetProps {
  isOpen: boolean;
  exercise: Exercise;
  onClose: () => void;
}

export const TechniqueSheet: React.FC<TechniqueSheetProps> = ({
  isOpen,
  exercise,
  onClose,
}) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              backgroundColor: "rgba(0,0,0,0.65)",
            }}
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 71,
              background: "rgba(18,18,18,0.75)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3 shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <p
                  className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Técnica
                </p>
                <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {exercise.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-opacity active:opacity-60"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <X className="w-4 h-4 text-white" strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-3">

              {/* Technique tip */}
              {exercise.technique_tip && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                      strokeWidth={2}
                    />
                    <p
                      className="text-[10px] uppercase tracking-widest font-semibold"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      Técnica
                    </p>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {exercise.technique_tip}
                  </p>
                </div>
              )}

              {/* Common error */}
              {exercise.common_error && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.18)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle
                      className="w-3.5 h-3.5 shrink-0 text-red-400"
                      strokeWidth={2}
                    />
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-red-400">
                      Error común
                    </p>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {exercise.common_error}
                  </p>
                </div>
              )}

              {/* YouTube link */}
              {exercise.youtube_url && (
                <a
                  href={exercise.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl p-4 transition-opacity active:opacity-60"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    textDecoration: "none",
                  }}
                >
                  <Youtube className="w-5 h-5 shrink-0 text-red-500 fill-red-500" />
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    Ver video en YouTube
                  </p>
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
