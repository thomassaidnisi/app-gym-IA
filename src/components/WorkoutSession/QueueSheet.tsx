import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { X, GripVertical } from "lucide-react";
import { QueueItem } from "../../types";

interface QueueSheetProps {
  isOpen: boolean;
  items: QueueItem[];
  onConfirm: (newIds: string[]) => void;
  onClose: () => void;
}

function blockTypeLabel(item: QueueItem): string {
  if (item.block.is_superset) return "Superserie";
  const t = item.block.type.toLowerCase();
  if (t.includes("strength") || t.includes("fuerza")) return "Fuerza";
  if (t.includes("hypertrophy") || t.includes("hipertrofia")) return "Hipertrofia";
  return item.block.label || item.block.type;
}

export const QueueSheet: React.FC<QueueSheetProps> = ({
  isOpen,
  items,
  onConfirm,
  onClose,
}) => {
  const [order, setOrder] = useState<QueueItem[]>(items);

  // Sync local order when sheet reopens with a fresh queue
  React.useEffect(() => {
    if (isOpen) setOrder(items);
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(order.map((item) => item.id));
    onClose();
  };

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
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 71,
              backgroundColor: "#111",
              borderRadius: "20px 20px 0 0",
              maxHeight: "78vh",
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
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <p className="text-sm font-bold text-white">Cola de ejercicios</p>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-opacity active:opacity-60"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <X className="w-4 h-4 text-white" strokeWidth={2} />
              </button>
            </div>

            <p
              className="px-5 pb-3 text-xs shrink-0"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              Arrastrá para reordenar · el ejercicio actual no cambia
            </p>

            {/* Reorderable list */}
            {order.length === 0 ? (
              <p
                className="flex-1 flex items-center justify-center text-sm"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                No quedan ejercicios pendientes
              </p>
            ) : (
              <Reorder.Group
                axis="y"
                values={order}
                onReorder={setOrder}
                style={{
                  overflowY: "auto",
                  flex: 1,
                  listStyle: "none",
                  padding: "0 16px",
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {order.map((item) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    style={{
                      listStyle: "none",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      cursor: "grab",
                      userSelect: "none",
                    }}
                    whileDrag={{
                      backgroundColor: "rgba(255,255,255,0.11)",
                      scale: 1.02,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      cursor: "grabbing",
                    }}
                  >
                    <GripVertical
                      className="w-4 h-4 shrink-0"
                      style={{ color: "rgba(255,255,255,0.22)" }}
                      strokeWidth={2}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.exercise.name}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {blockTypeLabel(item)} · {item.exercise.sets} series
                      </p>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            {/* Confirm button */}
            <div className="px-5 pt-4 shrink-0">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                className="w-full rounded-2xl font-black text-base text-black"
                style={{ backgroundColor: "#c8f135", height: 52 }}
              >
                Confirmar orden
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
