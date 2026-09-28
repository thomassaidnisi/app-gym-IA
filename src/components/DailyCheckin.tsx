import React, { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "./AuthContext";
import { saveDailyCheckin } from "../lib/db";
import { calculateReadinessScore } from "../lib/readiness";

interface DailyCheckinProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

const SLEEP_OPTIONS = [
  { value: 4, label: "4h" },
  { value: 5, label: "5h" },
  { value: 6, label: "6h" },
  { value: 7, label: "7h" },
  { value: 8, label: "8h+" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "Muy baja" },
  { value: 2, label: "Baja" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Alta" },
  { value: 5, label: "Muy alta" },
];

const SORENESS_OPTIONS = [
  { value: 1, label: "Muy cargados" },
  { value: 2, label: "Algo cargados" },
  { value: 3, label: "Bien" },
  { value: 4, label: "Frescos" },
  { value: 5, label: "Perfectos" },
];

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

const ChipRow: React.FC<{
  options: { value: number; label: string }[];
  selected: number | null;
  onSelect: (value: number) => void;
}> = ({ options, selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onSelect(opt.value)}
        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
          selected === opt.value ? "bg-lime-400 text-black" : "bg-zinc-800 text-zinc-300"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const DailyCheckin: React.FC<DailyCheckinProps> = ({ onComplete, onClose }) => {
  const { user } = useAuth();
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [muscleSoreness, setMuscleSoreness] = useState<number | null>(null);
  const [pesoInput, setPesoInput] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = sleepHours !== null && energyLevel !== null && muscleSoreness !== null;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    const score = calculateReadinessScore(sleepHours!, energyLevel!, muscleSoreness!);
    const peso = pesoInput.trim() ? parseFloat(pesoInput) : undefined;

    if (user) {
      await saveDailyCheckin(user.id, {
        date: getTodayDateStr(),
        sleepHours: sleepHours!,
        energyLevel: energyLevel!,
        muscleSoreness: muscleSoreness!,
        readinessScore: score,
        peso: peso !== undefined && !isNaN(peso) ? peso : undefined,
      });
    }
    setSaving(false);
    onComplete(score);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-900 rounded-t-3xl flex flex-col"
        style={{ height: "85vh" }}
      >
        <div className="px-6 pt-6 shrink-0">
          <h2 className="text-2xl font-extrabold text-white">¿Cómo llegás hoy?</h2>
          <p className="text-xs text-zinc-500 mt-1">Tarda menos de 30 segundos</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-white mb-2.5">¿Cuánto dormiste?</p>
            <ChipRow options={SLEEP_OPTIONS} selected={sleepHours} onSelect={setSleepHours} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white mb-2.5">¿Cómo está tu energía?</p>
            <ChipRow options={ENERGY_OPTIONS} selected={energyLevel} onSelect={setEnergyLevel} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white mb-2.5">¿Cómo están tus músculos?</p>
            <ChipRow options={SORENESS_OPTIONS} selected={muscleSoreness} onSelect={setMuscleSoreness} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white mb-2.5">Peso de hoy (opcional)</p>
            <input
              type="number"
              inputMode="decimal"
              value={pesoInput}
              onChange={(e) => setPesoInput(e.target.value)}
              placeholder="kg"
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 shrink-0 border-t border-zinc-800">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="w-full h-14 rounded-2xl font-black text-base text-black disabled:opacity-40"
            style={{ backgroundColor: "#c8f135" }}
          >
            {saving ? "Guardando…" : "Listo"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
