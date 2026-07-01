import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface ExitSheetProps {
  isOpen: boolean;
  onContinue: () => void;
  onAbandon: () => void;
}

export const ExitSheet: React.FC<ExitSheetProps> = ({
  isOpen,
  onContinue,
  onAbandon,
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
            onClick={onContinue}
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
              display: "flex",
              flexDirection: "column",
              paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              />
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-base font-black text-white mb-1">
                ¿Abandonar el entrenamiento?
              </p>
              <p
                className="text-sm leading-snug"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Vas a poder revisar y guardar las series que completaste hasta ahora.
              </p>
            </div>

            {/* Buttons */}
            <div className="px-5 pt-4 flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                onClick={onContinue}
                className="w-full h-13 rounded-2xl font-black text-base text-black"
                style={{ backgroundColor: "#c8f135", height: 52 }}
              >
                Seguir entrenando
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                onClick={onAbandon}
                className="w-full h-12 rounded-2xl text-sm font-semibold"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Abandonar y revisar lo completado
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
