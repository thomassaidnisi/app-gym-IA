import React, { useState } from "react";
import { FullTrainingPlan, UserProfile } from "../types";
import { ShieldAlert, Clock, Dumbbell, Compass, Check, X, Edit2, Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { saveProfile } from "../lib/db";

interface ProfileTabProps {
  plan: FullTrainingPlan;
  profile: UserProfile;
  onRegenerate: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
  hero:    "var(--surface-hero)",
};

export const ProfileTab: React.FC<ProfileTabProps> = ({
  plan,
  profile,
  onRegenerate,
  onProfileUpdated,
}) => {
  const { user, signOut } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { pref, setTheme } = useTheme();
  const cycleTheme = () =>
    setTheme(pref === "light" ? "dark" : pref === "dark" ? "auto" : "light");

  const [name, setName] = useState(profile.name || "");
  const [age, setAge] = useState(profile.age || 30);
  const [weight, setWeight] = useState(profile.weight || 75);
  const [height, setHeight] = useState(profile.height || 175);
  const [gender, setGender] = useState(profile.gender || "Prefiero no decir");
  const [exercisesToAvoid, setExercisesToAvoid] = useState(profile.exercisesToAvoid || "");
  const [injuriesOrLimitations, setInjuriesOrLimitations] = useState(
    profile.injuriesOrLimitations || ""
  );

  const heightInMeters = profile.height / 100;
  const bmiVal = (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);

  const getBmiClassification = (bmi: number) => {
    if (bmi < 18.5) return "Bajo Peso";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Sobrepeso";
    return "Obesidad";
  };

  const handleSaveEdit = () => {
    const updated: UserProfile = {
      ...profile,
      name,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      gender,
      goals: profile.goals || [],
      objective: profile.objective || "",
      exercisesToAvoid,
      injuriesOrLimitations,
    };
    localStorage.setItem("healty_profile", JSON.stringify(updated));
    if (user) saveProfile(user.id, updated).catch(console.error);
    onProfileUpdated(updated);
    setIsEditOpen(false);
  };

  const handleRegenerateClick = () => {
    const confirmed = window.confirm(
      "¿Seguro que deseas regenerar el plan? El plan actual se perderá, aunque conservaremos tus datos de onboarding."
    );
    if (confirmed) onRegenerate();
  };

  const currentBmi = parseFloat(bmiVal);

  const stepperCls =
    "w-9 h-9 rounded-full border font-bold text-lg flex items-center justify-center hover:bg-[var(--bg-primary)] transition-all active:scale-95 select-none shrink-0";
  const stepperSty: React.CSSProperties = {
    backgroundColor: T.bgSec,
    borderColor: T.border,
    color: T.textPri,
  };

  const inputCls =
    "w-full rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--text-primary)]";
  const inputSty: React.CSSProperties = {
    backgroundColor: T.bgSec,
    border: `1px solid ${T.border}`,
    color: T.textPri,
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 pt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight select-none" style={{ color: T.textPri }}>
            Perfil Atleta
          </h1>
          <p className="text-xs tracking-wide mt-1" style={{ color: T.textSec }}>
            Información médica, biotipos de progresión e inteligencia
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={cycleTheme}
          className="p-2 rounded-xl shrink-0 mt-1 mr-10"
          style={{ color: T.textTer }}
          aria-label="Cambiar apariencia"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pref}
              initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {pref === "light" ? <Sun className="w-5 h-5" />
                : pref === "dark" ? <Moon className="w-5 h-5" />
                : <Monitor className="w-5 h-5" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Hero Card */}
      <div
        className="rounded-3xl p-6 mb-6 shadow-md"
        style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 text-white rounded-2xl flex items-center justify-center text-2xl font-bold tracking-tight shrink-0"
            style={{ backgroundColor: T.hero }}
          >
            {profile.name ? profile.name.substring(0, 1).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight" style={{ color: T.textPri }}>
              {profile.name || "Atleta Healty"}
            </h2>
            <span className="text-xs tracking-wider block mt-0.5" style={{ color: T.textSec }}>
              {plan.plan_name}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {((profile.goals && profile.goals.length > 0)
                ? profile.goals
                : [profile.objective || "No especificado"]
              )
                .filter(Boolean)
                .map((gLine, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block"
                    style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
                  >
                    {gLine}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Edad", value: profile.age, unit: "años" },
            { label: "Peso", value: profile.weight, unit: "kg" },
            { label: "Altura", value: profile.height, unit: "cm" },
            { label: "IMC", value: bmiVal, unit: getBmiClassification(currentBmi) },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              className="p-3 rounded-2xl text-center"
              style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}
            >
              <span className="text-[8px] block uppercase mb-1" style={{ color: T.textTer }}>
                {label}
              </span>
              <strong className="text-base font-bold tabular-nums block" style={{ color: T.textPri }}>
                {value}
              </strong>
              <span className="text-[8px] block mt-0.5 uppercase truncate px-0.5" style={{ color: T.textSec }}>
                {unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6 select-none">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsEditOpen(true)}
          className="hover:bg-[var(--bg-secondary)] p-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
          style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri }}
          id="open-edit-profile-modal-btn"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Editar Perfil
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleRegenerateClick}
          className="border border-red-200 hover:border-red-300 text-red-500 hover:bg-red-50 p-3.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
          id="regenerate-plan-btn"
        >
          <Compass className="w-3.5 h-3.5" />
          Regenerar Plan
        </motion.button>
      </div>

      {/* Plan Details */}
      <div
        className="rounded-3xl p-5 mb-6 shadow-sm"
        style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
      >
        <h4
          className="text-xs uppercase tracking-wider font-bold mb-4 select-none"
          style={{ color: T.textPri }}
        >
          Parámetros Estructurales del Plan
        </h4>
        <div className="space-y-3.5">
          {[
            { icon: <Compass className="w-4 h-4" style={{ color: T.textSec }} />, label: "División elegida", value: plan.division },
            { icon: <Dumbbell className="w-4 h-4" style={{ color: T.textSec }} />, label: "Frecuencia semanal", value: `${plan.days_per_week} entrenamientos` },
            { icon: <Clock className="w-4 h-4" style={{ color: T.textSec }} />, label: "Duración de cada sesión", value: `${plan.session_duration} sugeridos` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="p-1.5 rounded-lg shrink-0"
                style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}
              >
                {icon}
              </div>
              <div>
                <span className="text-[10px] uppercase block" style={{ color: T.textTer }}>{label}</span>
                <strong className="text-xs uppercase font-bold" style={{ color: T.textPri }}>{value}</strong>
              </div>
            </div>
          ))}

          {plan.cardio_note && (
            <div className="mt-4 pt-3.5" style={{ borderTop: `1px solid ${T.border}` }}>
              <span className="text-[10px] uppercase block mb-1" style={{ color: T.textTer }}>
                Estrategia Cardio Integrada
              </span>
              <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>{plan.cardio_note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Progression Guide */}
      {plan.progression_guide && (
        <div
          className="rounded-3xl p-5 mb-6 shadow-sm"
          style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
        >
          <h4
            className="text-xs uppercase tracking-wider font-bold mb-2 select-none"
            style={{ color: T.textPri }}
          >
            Pauta de Progresión sobre Cargas
          </h4>
          <p className="text-xs leading-relaxed select-text" style={{ color: T.textSec }}>
            {plan.progression_guide}
          </p>
        </div>
      )}

      {/* Medical Note */}
      {plan.medical_note && (
        <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 mb-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-orange-600 text-xs uppercase tracking-wider font-bold mb-1 select-none">
              Restricciones Médicas y Clínicas
            </h4>
            <p className="text-orange-800 text-xs leading-relaxed select-text">
              {plan.medical_note}
            </p>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="flex justify-center mt-2 mb-6">
        <button
          onClick={() => signOut()}
          className="text-sm px-4 py-2 rounded-xl transition-opacity active:opacity-50"
          style={{ color: "#ef4444" }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col shadow-2xl relative max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
            >
              <button
                onClick={() => setIsEditOpen(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-bold text-lg mb-1" style={{ color: T.textPri }}>Editar Perfil</h3>
              <p className="text-[10px] uppercase tracking-wider mb-5" style={{ color: T.textTer }}>
                Actualiza variables físicas sin regenerar la rutina
              </p>

              <div className="space-y-5 text-xs font-sans">
                {/* Name */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: T.textSec }}>Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    style={inputSty}
                  />
                </div>

                {/* Age stepper */}
                <div>
                  <label className="block font-semibold mb-2" style={{ color: T.textSec }}>Edad (años)</label>
                  <div className="flex items-center justify-between gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAge((a) => Math.max(1, Number(a) - 1))} className={stepperCls} style={stepperSty}>−</motion.button>
                    <span className="flex-1 text-center font-bold text-2xl tabular-nums" style={{ color: T.textPri }}>{age}</span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAge((a) => Math.min(120, Number(a) + 1))} className={stepperCls} style={stepperSty}>+</motion.button>
                  </div>
                </div>

                {/* Weight stepper */}
                <div>
                  <label className="block font-semibold mb-2" style={{ color: T.textSec }}>Peso (kg)</label>
                  <div className="flex items-center justify-between gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeight((w) => Math.max(20, parseFloat((Number(w) - 0.5).toFixed(1))))} className={stepperCls} style={stepperSty}>−</motion.button>
                    <span className="flex-1 text-center font-bold text-2xl tabular-nums" style={{ color: T.textPri }}>{weight}</span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeight((w) => Math.min(300, parseFloat((Number(w) + 0.5).toFixed(1))))} className={stepperCls} style={stepperSty}>+</motion.button>
                  </div>
                </div>

                {/* Height stepper */}
                <div>
                  <label className="block font-semibold mb-2" style={{ color: T.textSec }}>Altura (cm)</label>
                  <div className="flex items-center justify-between gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHeight((h) => Math.max(50, Number(h) - 1))} className={stepperCls} style={stepperSty}>−</motion.button>
                    <span className="flex-1 text-center font-bold text-2xl tabular-nums" style={{ color: T.textPri }}>{height}</span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHeight((h) => Math.min(250, Number(h) + 1))} className={stepperCls} style={stepperSty}>+</motion.button>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: T.textSec }}>Género</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={inputCls}
                    style={inputSty}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Prefiero no decir">Prefiero no decir</option>
                  </select>
                </div>

                {/* Exercises to avoid */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: T.textSec }}>
                    Evitar ejercicios
                  </label>
                  <input
                    type="text"
                    value={exercisesToAvoid}
                    onChange={(e) => setExercisesToAvoid(e.target.value)}
                    className={inputCls}
                    style={inputSty}
                  />
                </div>

                {/* Injuries */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: T.textSec }}>
                    Limitaciones / Lesiones
                  </label>
                  <input
                    type="text"
                    value={injuriesOrLimitations}
                    onChange={(e) => setInjuriesOrLimitations(e.target.value)}
                    className={inputCls}
                    style={inputSty}
                  />
                </div>

                {/* Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-3 rounded-xl font-semibold text-xs transition-all hover:bg-[var(--bg-secondary)]"
                    style={{ border: `1px solid ${T.border}`, color: T.textSec }}
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveEdit}
                    className="flex-1 py-3 bg-brand hover:bg-lime-400 text-black rounded-xl font-semibold text-xs flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 text-black" />
                    Guardar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
