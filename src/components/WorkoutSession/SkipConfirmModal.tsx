import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface SkipConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SkipConfirmModal: React.FC<SkipConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
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
            onClick={onCancel}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              backgroundColor: "rgba(0,0,0,0.65)",
            }}
          />

          {/* Modal card */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 81,
              width: "min(320px, calc(100vw - 48px))",
              background: "rgba(24,24,24,0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <p className="text-base font-black text-white mb-1 text-center">
              ¿Saltear este ejercicio?
            </p>
            <p
              className="text-sm text-center mb-5 leading-snug"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              No vas a registrar ninguna serie y no va a aparecer en tu resumen final.
            </p>
            <div className="flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                onClick={onConfirm}
                className="w-full h-12 rounded-2xl font-black text-sm text-black"
                style={{ backgroundColor: "#c8f135" }}
              >
                Sí, saltear
              </motion.button>
              <button
                onClick={onCancel}
                className="w-full h-11 rounded-2xl text-sm font-semibold"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
