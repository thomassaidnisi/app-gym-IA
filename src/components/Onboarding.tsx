import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, FullTrainingPlan } from "../types";
import { Dumbbell, ChevronRight, ChevronLeft, Check, AlertCircle, RefreshCw, Sparkles, FileUp, Target, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PlanUpload } from "./PlanUpload";
import { useAuth } from "./AuthContext";
import { saveProfile, savePlan } from "../lib/db";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface OnboardingProps {
  onPlanGenerated: (plan: FullTrainingPlan, profile: UserProfile) => void;
}

type StepId =
  | "welcome" | "name" | "physical" | "goals" | "medical" | "experience"
  | "location" | "dayAssignment" | "availability"
  | "gymCardio" | "gymStrength" | "homeEquipment"
  | "preferences";

export const Onboarding: React.FC<OnboardingProps> = ({ onPlanGenerated }) => {
  const { user } = useAuth();
  const { isSupported: pushSupported, subscribe: subscribePush } = usePushNotifications();
  const [step, setStep] = useState(1);
  const [pendingPlanResult, setPendingPlanResult] = useState<{ plan: FullTrainingPlan; profile: UserProfile } | null>(null);
  const [pushPromptLoading, setPushPromptLoading] = useState(false);

  const handlePlanReady = (plan: FullTrainingPlan, profile: UserProfile) => {
    if (!pushSupported) {
      onPlanGenerated(plan, profile);
      return;
    }
    setPendingPlanResult({ plan, profile });
  };

  const handleEnablePushAndContinue = async () => {
    if (!pendingPlanResult) return;
    setPushPromptLoading(true);
    try {
      await subscribePush();
    } catch (e) {
      console.error("Failed to subscribe to push notifications:", e);
    } finally {
      setPushPromptLoading(false);
      onPlanGenerated(pendingPlanResult.plan, pendingPlanResult.profile);
    }
  };

  const handleSkipPushAndContinue = () => {
    if (!pendingPlanResult) return;
    onPlanGenerated(pendingPlanResult.plan, pendingPlanResult.profile);
  };

  // --- Existing state ---
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [muscleFocus, setMuscleFocus] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [otherMedical, setOtherMedical] = useState("");
  const [experience, setExperience] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [sessionDuration, setSessionDuration] = useState("60 min");
  const [cardioEquipment, setCardioEquipment] = useState<string[]>([]);
  const [strengthEquipment, setStrengthEquipment] = useState<string[]>([]);
  const [exercisesToAvoid, setExercisesToAvoid] = useState("");
  const [injuriesOrLimitations, setInjuriesOrLimitations] = useState("");
  const [specificGoal, setSpecificGoal] = useState("");

  // --- New location state ---
  const [trainingLocation, setTrainingLocation] = useState<"home" | "gym" | "both" | "">("");
  const [locationByDay, setLocationByDay] = useState<Record<string, "" | "gym" | "home">>({});
  const [gymCardioEquipment, setGymCardioEquipment] = useState<string[]>([]);
  const [gymStrengthEquipment, setGymStrengthEquipment] = useState<string[]>([]);
  const [homeEquipment, setHomeEquipment] = useState<string[]>([]);

  // --- Step sequence (dynamic for "both" mode) ---
  const stepSequence = useMemo((): StepId[] => {
    const s: StepId[] = [
      "welcome", "name", "physical", "goals", "medical", "experience", "location",
    ];
    if (trainingLocation === "both") s.push("dayAssignment");
    s.push("availability");
    if (trainingLocation === "both") {
      s.push("gymCardio", "gymStrength", "homeEquipment");
    } else {
      s.push("gymCardio", "gymStrength");
    }
    s.push("preferences");
    return s;
  }, [trainingLocation]);

  const totalSteps = stepSequence.length;
  const currentStepId: StepId = stepSequence[step - 1] ?? "welcome";

  // Safety clamp: if location changes and sequence shrinks, don't leave step out of bounds
  useEffect(() => {
    if (step > stepSequence.length) setStep(stepSequence.length);
  }, [stepSequence.length]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onboardingFlow, setOnboardingFlow] = useState<"questions" | "choose_method" | "upload">("questions");

  const loadingPhrases = [
    "Analizando tu perfil...",
    "Diseñando tu plan...",
    "Eligiendo los mejores ejercicios...",
    "Calculando volumen y progresión...",
    "Adaptando pautas médicas...",
    "Configurando calentamiento y estiramientos...",
    "Casi listo...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    const existing = localStorage.getItem("healty_profile");
    if (existing) {
      try {
        const p = JSON.parse(existing) as UserProfile;
        let initialGoals: string[] = [];
        if (p.goals && Array.isArray(p.goals)) {
          initialGoals = p.goals;
        } else if (p.objective) {
          initialGoals = p.objective === "⚖️ Ganar músculo y perder grasa"
            ? ["💪 Ganar músculo (hipertrofia)", "🔥 Perder grasa corporal"]
            : [p.objective];
        }
        setGoals(initialGoals);
        setMuscleFocus(p.muscle_focus || []);
        setName(p.name || "");
        setAge(p.age || "");
        setWeight(p.weight || "");
        setHeight(p.height || "");
        setGender(p.gender || "");
        setMedicalConditions(p.medicalConditions || []);
        setExperience(p.experience || "");
        setDaysPerWeek(p.daysPerWeek || 3);
        setSessionDuration(p.sessionDuration || "60 min");
        setCardioEquipment(p.cardioEquipment || []);
        setStrengthEquipment(p.strengthEquipment || []);
        setExercisesToAvoid(p.exercisesToAvoid || "");
        setInjuriesOrLimitations(p.injuriesOrLimitations || "");
        setSpecificGoal(p.specificGoal || "");
        setTrainingLocation(p.trainingLocation || "");
        if (p.locationByDay) {
          setLocationByDay(
            Object.fromEntries(
              Object.entries(p.locationByDay).map(([k, v]) => [k, v ?? ""])
            ) as Record<string, "" | "gym" | "home">
          );
        }
        setGymCardioEquipment(p.gymCardioEquipment || []);
        setGymStrengthEquipment(p.gymStrengthEquipment || []);
        setHomeEquipment(p.homeEquipment || []);
      } catch (e) { console.error("Failed to prefill stored profile:", e); }
    }
  }, []);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else setOnboardingFlow("choose_method");
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  // --- Toggle helpers ---
  const toggleGoal = (goalId: string) => {
    setGoals((prev) => {
      const next = prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId];
      if (goalId === "💪 Ganar músculo (hipertrofia)" && !next.includes(goalId)) {
        setMuscleFocus([]);
      }
      return next;
    });
  };

  const toggleMuscleFocus = (zone: string) => {
    if (zone === "⚖️ Full body") {
      setMuscleFocus(["⚖️ Full body"]);
    } else {
      let current = muscleFocus.filter((z) => z !== "⚖️ Full body");
      current = current.includes(zone) ? current.filter((z) => z !== zone) : [...current, zone];
      setMuscleFocus(current);
    }
  };

  const toggleMedical = (cond: string) => {
    if (cond === "Ninguna") {
      setMedicalConditions(["Ninguna"]);
    } else {
      let current = medicalConditions.filter((c) => c !== "Ninguna");
      current = current.includes(cond) ? current.filter((c) => c !== cond) : [...current, cond];
      if (current.length === 0) current = ["Ninguna"];
      setMedicalConditions(current);
    }
  };

  const toggleCardio = (equip: string) => {
    if (equip === "❌ No tiene cardio") {
      setCardioEquipment(["❌ No tiene cardio"]);
    } else {
      let current = cardioEquipment.filter((c) => c !== "❌ No tiene cardio");
      current = current.includes(equip) ? current.filter((c) => c !== equip) : [...current, equip];
      setCardioEquipment(current);
    }
  };

  const toggleStrength = (equip: string) => {
    setStrengthEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip]
    );
  };

  const toggleGymCardio = (equip: string) => {
    if (equip === "❌ No tiene cardio") {
      setGymCardioEquipment(["❌ No tiene cardio"]);
    } else {
      let current = gymCardioEquipment.filter((c) => c !== "❌ No tiene cardio");
      current = current.includes(equip) ? current.filter((c) => c !== equip) : [...current, equip];
      setGymCardioEquipment(current);
    }
  };

  const toggleGymStrength = (equip: string) => {
    setGymStrengthEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip]
    );
  };

  const toggleHomeEquipment = (equip: string) => {
    setHomeEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip]
    );
  };

  const cycleDayLocation = (dayKey: string) => {
    setLocationByDay((prev) => {
      const current = prev[dayKey] || "";
      const next = current === "" ? "gym" : current === "gym" ? "home" : "";
      return { ...prev, [dayKey]: next };
    });
  };

  // --- Validation ---
  const isStepValid = () => {
    switch (currentStepId) {
      case "welcome":       return true;
      case "name":          return name.trim().length > 0;
      case "physical":      return age !== "" && age > 0 && weight !== "" && weight > 0 && height !== "" && height > 0 && gender !== "";
      case "goals":         return goals.length > 0;
      case "medical":       return medicalConditions.length > 0 || otherMedical.trim().length > 0;
      case "experience":    return experience !== "";
      case "location":      return trainingLocation !== "";
      case "dayAssignment": return Object.values(locationByDay).some(v => v === "gym" || v === "home");
      case "availability":  return daysPerWeek >= 2 && daysPerWeek <= 6 && sessionDuration !== "";
      case "gymCardio":     return (trainingLocation === "both" ? gymCardioEquipment : cardioEquipment).length > 0;
      case "gymStrength":   return (trainingLocation === "both" ? gymStrengthEquipment : strengthEquipment).length > 0;
      case "homeEquipment": return homeEquipment.length > 0;
      case "preferences":   return true;
      default:              return true;
    }
  };

  // --- Generate plan ---
  const generatePlan = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    const activeMedicalList = [...medicalConditions];
    if (otherMedical.trim() && !activeMedicalList.includes(otherMedical.trim())) {
      activeMedicalList.push(otherMedical.trim());
    }

    // Days left unassigned are excluded — server treats them as Rest
    const assignedLocationByDay = Object.fromEntries(
      Object.entries(locationByDay).filter(([, v]) => v === "gym" || v === "home")
    );

    const payload: UserProfile = {
      name, age: Number(age), weight: Number(weight), height: Number(height),
      gender, goals, objective: goals.join(", "), muscle_focus: muscleFocus,
      medicalConditions: activeMedicalList, experience, daysPerWeek,
      sessionDuration, cardioEquipment, strengthEquipment,
      exercisesToAvoid, injuriesOrLimitations, specificGoal,
      trainingLocation: (trainingLocation as "home" | "gym" | "both") || "gym",
      // Only include split-location fields for "both" — avoids empty arrays polluting the payload
      ...(trainingLocation === "both" && {
        locationByDay: assignedLocationByDay,
        gymCardioEquipment,
        gymStrengthEquipment,
        homeEquipment,
      }),
    };

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocurrió un error en el servidor.");
      }
      const generatedPlan: FullTrainingPlan = await response.json();
      localStorage.setItem("healty_plan", JSON.stringify(generatedPlan));
      localStorage.setItem("healty_profile", JSON.stringify(payload));
      if (user) {
        await Promise.all([saveProfile(user.id, payload), savePlan(user.id, generatedPlan)]);
      }
      handlePlanReady(generatedPlan, payload);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Fallo al conectar con el servidor. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const progressPercent = step === 1 ? 0 : Math.round(((step - 1) / (totalSteps - 1)) * 100);

  // --- Loading state ---
  if (isGenerating) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 text-center select-none">
        <div className="relative mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-brand animate-spin"></div>
          <Dumbbell className="w-10 h-10 text-brand absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <AnimatePresence mode="wait">
          <motion.h3
            key={loadingTextIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="text-white text-xl font-bold"
          >
            {loadingPhrases[loadingTextIndex]}
          </motion.h3>
        </AnimatePresence>
        <p className="text-white/40 text-sm mt-3 max-w-xs leading-relaxed">
          Nuestra IA está armando un plan premium de entrenamiento exclusivo para vos.
        </p>
      </div>
    );
  }

  // --- Error state ---
  if (errorMsg) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-black">
        <div className="w-16 h-16 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-white text-xl font-bold mb-3">Error al generar plan</h3>
        <p className="text-white/50 text-sm max-w-sm mb-6 leading-relaxed">{errorMsg}</p>
        <motion.button
          whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
          onClick={generatePlan}
          className="bg-brand text-black hover:bg-lime-400 font-semibold px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 animate-pulse" />
          Reintentar generación
        </motion.button>
        <button
          onClick={() => { setErrorMsg(null); setStep(totalSteps); }}
          className="text-white/40 hover:text-white text-xs underline mt-4"
        >
          Editar mis respuestas
        </button>
      </div>
    );
  }

  // --- Push notification prompt (after plan is ready, before entering the app) ---
  if (pendingPlanResult) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 text-center select-none">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
          style={{ backgroundColor: "rgba(200,241,53,0.10)", border: "1px solid rgba(200,241,53,0.25)" }}
        >
          <Bell className="w-9 h-9 text-brand" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¡Tu plan está listo! 🎉</h2>
        <p className="text-white/50 text-sm mb-8 max-w-xs leading-relaxed">
          ¿Querés que te recordemos cuando tenés que entrenar?
        </p>
        <motion.button
          whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
          onClick={handleEnablePushAndContinue}
          disabled={pushPromptLoading}
          className="w-full max-w-xs bg-brand hover:bg-lime-400 text-black font-semibold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-base"
        >
          {pushPromptLoading ? "Activando..." : "Sí, activar recordatorios"}
        </motion.button>
        <button
          onClick={handleSkipPushAndContinue}
          disabled={pushPromptLoading}
          className="w-full max-w-xs text-white/40 hover:text-white text-sm mt-4 disabled:opacity-50 transition-opacity"
        >
          Ahora no
        </button>
      </div>
    );
  }

  // --- Upload flow ---
  if (onboardingFlow === "upload") {
    const profilePayload: UserProfile = {
      name, age: Number(age), weight: Number(weight), height: Number(height),
      gender, goals, objective: goals.join(", "), muscle_focus: muscleFocus,
      medicalConditions, experience, daysPerWeek, sessionDuration,
      cardioEquipment, strengthEquipment, exercisesToAvoid, injuriesOrLimitations,
      trainingLocation: (trainingLocation as "home" | "gym" | "both") || "gym",
    };
    return (
      <PlanUpload
        profile={profilePayload}
        onBack={() => setOnboardingFlow("choose_method")}
        onPlanSaved={async (plan) => {
          localStorage.setItem("healty_plan", JSON.stringify(plan));
          localStorage.setItem("healty_profile", JSON.stringify(profilePayload));
          if (user) {
            await Promise.all([saveProfile(user.id, profilePayload), savePlan(user.id, plan)]);
          }
          handlePlanReady(plan, profilePayload);
        }}
      />
    );
  }

  // --- Choose method ---
  if (onboardingFlow === "choose_method") {
    return (
      <div className="w-full max-w-md mx-auto text-white py-6 px-4 select-none">
        <div className="text-center space-y-3 mb-10 mt-4">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-none">
            ¿Cómo querés <span className="text-brand">armar tu plan?</span>
          </h2>
          <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
            Elegí la metodología que se adapte mejor a tus objetivos.
          </p>
        </div>

        <div className="space-y-4">
          <div
            onClick={generatePlan}
            className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:border-white/30 hover:bg-white/10 cursor-pointer flex flex-col justify-between min-h-[190px]"
          >
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse-slow" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Generar con IA</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Diseñamos un plan 100% personalizado para vos desde cero.
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
              onClick={(e) => { e.stopPropagation(); generatePlan(); }}
              className="mt-5 w-full bg-brand text-black border-transparent text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer hover:bg-lime-400"
            >
              Generar mi plan
            </motion.button>
          </div>

          <div
            onClick={() => setOnboardingFlow("upload")}
            className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:border-white/30 hover:bg-white/10 cursor-pointer flex flex-col justify-between min-h-[190px]"
          >
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/50 group-hover:text-white transition-all shrink-0">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Ya tengo mi plan</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Subí el PDF o Excel de tu gimnasio. Lo digitalizamos y potenciamos con IA.
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
              onClick={(e) => { e.stopPropagation(); setOnboardingFlow("upload"); }}
              className="mt-5 w-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              Subir mi plan
            </motion.button>
          </div>
        </div>

        <button
          onClick={() => { setOnboardingFlow("questions"); setStep(totalSteps); }}
          className="w-full mt-6 py-3.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl text-xs font-semibold uppercase tracking-wider border border-white/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a las preguntas
        </button>
      </div>
    );
  }

  // --- Questions flow ---
  const selBtn = (active: boolean) =>
    `flex items-start text-left p-4 rounded-xl border transition-all relative ${
      active
        ? "bg-white/15 border-white/60 text-white shadow-md"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
    }`;

  const chipBtn = (active: boolean) =>
    `flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold text-left transition-all ${
      active
        ? "bg-white/15 border-white/60 text-white"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
    }`;

  const cardioOptions = [
    "🚴 Assault Bike","🚣 Remo Concept (ergómetro)","🎿 Ski Erg",
    "🏃 Cinta de correr","🚲 Bicicleta estática / spinning","🪢 Battle Ropes","❌ No tiene cardio",
  ];
  const strengthOptions = [
    "Barras libres + discos","Mancuernas","Máquinas Hammer","Cables / poleas",
    "TRX / anillas","Kettlebells","Máquina Smith","Cajones pliométricos",
  ];
  const homeEquipmentOptions = [
    ...cardioOptions.filter(e => e !== "❌ No tiene cardio"),
    ...strengthOptions,
  ];

  const weekDayOptions = [
    { key: "monday",    label: "Lunes" },
    { key: "tuesday",   label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday",  label: "Jueves" },
    { key: "friday",    label: "Viernes" },
    { key: "saturday",  label: "Sábado" },
    { key: "sunday",    label: "Domingo" },
  ];

  return (
    <div className="w-full max-w-lg mx-auto bg-black text-white px-4 md:px-0">
      {/* Progress bar */}
      {step > 1 && (
        <div className="pt-6 pb-2">
          <div className="flex items-center justify-between text-xs text-white/40 mb-2">
            <span>Paso {step} de {totalSteps}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-brand h-full rounded-full"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      )}

      <div className="py-6 min-h-[50vh] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            {/* Step: Welcome */}
            {currentStepId === "welcome" && (
              <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Background image */}
                <img
                  src="/onboarding-bg.png"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  style={{ zIndex: 0, userSelect: "none", pointerEvents: "none" }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/60" style={{ zIndex: 10 }} />
                {/* Content */}
                <div
                  className="relative flex flex-col items-center text-center justify-center h-full px-6"
                  style={{ zIndex: 20, paddingTop: "env(safe-area-inset-top, 24px)", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
                >
                  <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse-slow">
                    <Dumbbell className="w-10 h-10 text-brand" />
                  </div>
                  <h1 className="text-6xl font-extrabold tracking-tight text-white mb-2">
                    HEALTY <span className="text-brand">APP</span>
                  </h1>
                  <p className="text-xl font-light text-white/40 tracking-wide mb-8 italic">
                    "Entrená · Superá · Vive Mejor"
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left max-w-sm mb-10">
                    <h2 className="text-brand text-sm font-bold uppercase tracking-wider mb-2">
                      Entrenador Personal con IA
                    </h2>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Diseñamos un plan de fuerza e hipertrofia premium basado en tu nivel, condiciones médicas, equipamiento real y disponibilidad de tiempo.
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                    onClick={() => setStep(2)}
                    className="w-full max-w-xs bg-brand hover:bg-lime-400 text-black font-semibold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
                    id="start-onboarding-btn"
                  >
                    Empezar Onboarding
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            )}

            {/* Step: Name */}
            {currentStepId === "name" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Cómo te llamás?</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Para dirigirnos a vos con tu plan personalizado.</p>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-white/40 text-base placeholder-white/20"
                  id="name-input" autoFocus
                />
              </div>
            )}

            {/* Step: Physical data */}
            {currentStepId === "physical" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Contanos sobre vos</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Calculamos tu IMC para ajustar intensidad y pautas calóricas.</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Edad", placeholder: "30", value: age, setter: (v: any) => setAge(v === "" ? "" : Number(v)) },
                    { label: "Peso (kg)", placeholder: "75.5", value: weight, setter: (v: any) => setWeight(v === "" ? "" : Number(v)), step: "0.1" },
                    { label: "Altura (cm)", placeholder: "175", value: height, setter: (v: any) => setHeight(v === "" ? "" : Number(v)) },
                  ].map(({ label, placeholder, value, setter, step: s }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-white/40 uppercase mb-2">{label}</label>
                      <input
                        type="number" step={s} value={value}
                        onChange={(e) => setter(e.target.value === "" ? "" : e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-center text-white focus:outline-none focus:border-white/40 text-base"
                      />
                    </div>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Género</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Masculino", "Femenino", "Prefiero no decir"].map((g) => (
                    <button key={g} onClick={() => setGender(g)}
                      className={`py-3.5 rounded-xl text-xs font-bold transition-all border ${
                        gender === g ? "bg-white text-black border-white shadow-md" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Goals */}
            {currentStepId === "goals" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Cuáles son tus objetivos?</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Selecciona todos los que correspondan. Mínimo 1 opción.</p>
                <div className="flex flex-col gap-3">
                  {[
                    { id: "💪 Ganar músculo (hipertrofia)", title: "Ganar Músculo", desc: "Maximiza volumen de hipertrofia y trabajo de aislamiento.", icon: "💪" },
                    { id: "🔥 Perder grasa corporal", title: "Perder Grasa", desc: "Mejora densidad metabólica y mantiene masa magra.", icon: "🔥" },
                    { id: "🏋️ Ganar fuerza", title: "Ganar Fuerza", desc: "Prioriza carga neurológica, rangos bajos de series pesadas.", icon: "🏋️" },
                    { id: "❤️ Mejorar la salud general", title: "Mejorar Salud General", desc: "Estabilidad, cardio de zona 2 integrada y tono general.", icon: "❤️" },
                  ].map((obj) => (
                    <button key={obj.id} onClick={() => toggleGoal(obj.id)} className={selBtn(goals.includes(obj.id))}>
                      <span className="text-2xl mr-4 mt-1 bg-white/5 p-2 rounded-lg">{obj.icon}</span>
                      <div className="flex-1 pr-6">
                        <h4 className="font-bold text-sm text-white mb-1">{obj.title}</h4>
                        <p className="text-xs text-white/50 leading-snug">{obj.desc}</p>
                      </div>
                      {goals.includes(obj.id) && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 p-1 rounded-full border border-white/30">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {goals.includes("💪 Ganar músculo (hipertrofia)") && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-white mb-1">¿Qué zonas querés priorizar?</h3>
                    <p className="text-xs text-white/50 mb-3 leading-relaxed">Selección múltiple.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "🍑 Glúteos", "🦵 Piernas", "💪 Espalda", "🫁 Pecho",
                        "🤸 Hombros", "💪 Brazos", "🔥 Core", "⚖️ Full body",
                      ].map((zone) => (
                        <button key={zone} onClick={() => toggleMuscleFocus(zone)} className={chipBtn(muscleFocus.includes(zone))}>
                          <span>{zone}</span>
                          {muscleFocus.includes(zone) && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Medical */}
            {currentStepId === "medical" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Tenés alguna condición de salud?</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Adaptamos el entrenamiento para maximizar tu seguridad médica. Selección múltiple.</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {["Colesterol LDL alto","Presión arterial alta","Diabetes tipo 2","Problemas de rodilla","Problemas de espalda/columna","Ninguna"].map((cond) => (
                    <button key={cond} onClick={() => toggleMedical(cond)} className={chipBtn(medicalConditions.includes(cond))}>
                      <span>{cond}</span>
                      {medicalConditions.includes(cond) && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Otra condición</label>
                <input type="text" value={otherMedical} onChange={(e) => setOtherMedical(e.target.value)}
                  placeholder="Asma, lordosis, etc (opcional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 text-sm placeholder-white/20"
                />
              </div>
            )}

            {/* Step: Experience */}
            {currentStepId === "experience" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Nivel de experiencia</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">El volumen total de series escalará según tu adaptación.</p>
                <div className="flex flex-col gap-3">
                  {[
                    { id: "🌱 Principiante — Menos de 6 meses entrenando", title: "Principiante", sub: "🌱 Menos de 6 meses entrenando", desc: "Prioridad en mecánica básica de fuerza, control postural y descanso generoso." },
                    { id: "📈 Intermedio — Entre 6 meses y 2 años", title: "Intermedio", sub: "📈 Entre 6 meses y 2 años", desc: "Ejercicios compuestos pesados más aislados, menor tregua de descanso y superseries." },
                    { id: "🔥 Avanzado — Más de 2 años entrenando consistentemente", title: "Avanzado", sub: "🔥 Más de 2 años entrenando consistentemente", desc: "Técnicas avanzadas opcionales, mayor volumen e intensidad." },
                  ].map((lvl) => (
                    <button key={lvl.id} onClick={() => setExperience(lvl.id)}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                        experience === lvl.id ? "bg-white/15 border-white/60 text-white shadow-md" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-white mb-1">{lvl.title}</h4>
                      <span className="text-xs text-white/70 font-medium mb-1">{lvl.sub}</span>
                      <p className="text-xs text-white/40 leading-snug">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Location (NEW) */}
            {currentStepId === "location" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Dónde entrenás normalmente?</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Define el equipamiento disponible para tu plan.</p>
                <div className="flex flex-col gap-3">
                  {[
                    { id: "gym",  icon: "🏋️", title: "Gimnasio", desc: "Prefiero el gimnasio" },
                    { id: "home", icon: "🏠", title: "Casa",      desc: "Entreno en casa" },
                    { id: "both", icon: "🔄", title: "Ambos",    desc: "Uso los dos lugares" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTrainingLocation(opt.id as "home" | "gym" | "both")}
                      className={selBtn(trainingLocation === opt.id)}
                    >
                      <span className="text-2xl mr-4 mt-1 bg-white/5 p-2 rounded-lg">{opt.icon}</span>
                      <div className="flex-1 pr-6">
                        <h4 className="font-bold text-sm text-white mb-1">{opt.title}</h4>
                        <p className="text-xs text-white/50 leading-snug">{opt.desc}</p>
                      </div>
                      {trainingLocation === opt.id && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 p-1 rounded-full border border-white/30">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Day Assignment (NEW — only appears for "both") */}
            {currentStepId === "dayAssignment" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Qué días vas a cada lugar?</h2>
                <p className="text-white/50 text-sm mb-2 leading-relaxed">
                  Tocá cada día para asignarlo. Los días sin asignar se tratarán como descanso.
                </p>
                <p className="text-white/30 text-xs mb-6 uppercase tracking-wider">
                  Sin asignar → 🏋️ Gym → 🏠 Casa → Sin asignar
                </p>
                <div className="flex flex-col gap-2">
                  {weekDayOptions.map(({ key, label }) => {
                    const val = locationByDay[key] || "";
                    return (
                      <button
                        key={key}
                        onClick={() => cycleDayLocation(key)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold text-left transition-all ${
                          val === "gym"  ? "bg-white/15 border-white/60 text-white" :
                          val === "home" ? "bg-white/15 border-white/60 text-white" :
                                           "bg-white/5  border-white/10 text-white/40"
                        }`}
                      >
                        <span>{label}</span>
                        <span>
                          {val === "gym"  ? "🏋️ Gym"    :
                           val === "home" ? "🏠 Casa"   :
                                            "Sin asignar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Availability */}
            {currentStepId === "availability" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">¿Cuánto podés entrenar?</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">La división del programa se optimiza según tus días disponibles.</p>
                <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Días disponibles por semana</label>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {[2,3,4,5,6].map((dayOption) => (
                    <button key={dayOption} onClick={() => setDaysPerWeek(dayOption)}
                      className={`py-3.5 rounded-xl font-bold text-sm transition-all border ${
                        daysPerWeek === dayOption ? "bg-white text-black border-white shadow-md" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >{dayOption}</button>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Duración de cada sesión</label>
                <div className="grid grid-cols-4 gap-2">
                  {["45 min","60 min","75 min","90 min"].map((durOption) => (
                    <button key={durOption} onClick={() => setSessionDuration(durOption)}
                      className={`py-3.5 rounded-xl font-bold text-[10px] sm:text-xs transition-all border ${
                        sessionDuration === durOption ? "bg-white text-black border-white shadow-md" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >{durOption}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Cardio Equipment (gym/home single, or gym half of "both") */}
            {currentStepId === "gymCardio" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  {trainingLocation === "both" ? "Cardio · Gimnasio" :
                   trainingLocation === "home"  ? "Equipamiento de Cardio · Casa" :
                                                  "Equipamiento de Cardio"}
                </h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Selección múltiple.</p>
                <div className="grid grid-cols-2 gap-2">
                  {cardioOptions.map((equip) => {
                    const active = trainingLocation === "both"
                      ? gymCardioEquipment.includes(equip)
                      : cardioEquipment.includes(equip);
                    const toggle = trainingLocation === "both" ? toggleGymCardio : toggleCardio;
                    return (
                      <button key={equip} onClick={() => toggle(equip)} className={chipBtn(active)}>
                        <span>{equip}</span>
                        {active && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Strength Equipment (gym/home single, or gym half of "both") */}
            {currentStepId === "gymStrength" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  {trainingLocation === "both" ? "Fuerza · Gimnasio" :
                   trainingLocation === "home"  ? "Equipamiento de Fuerza · Casa" :
                                                  "Equipamiento de Fuerza"}
                </h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Selección múltiple.</p>
                <div className="grid grid-cols-2 gap-2">
                  {strengthOptions.map((equip) => {
                    const active = trainingLocation === "both"
                      ? gymStrengthEquipment.includes(equip)
                      : strengthEquipment.includes(equip);
                    const toggle = trainingLocation === "both" ? toggleGymStrength : toggleStrength;
                    return (
                      <button key={equip} onClick={() => toggle(equip)} className={chipBtn(active)}>
                        <span>{equip}</span>
                        {active && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Home Equipment (NEW — only for "both") */}
            {currentStepId === "homeEquipment" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Equipamiento en Casa</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">
                  Seleccioná todo lo disponible en casa — cardio y fuerza en una sola lista.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {homeEquipmentOptions.map((equip) => (
                    <button key={equip} onClick={() => toggleHomeEquipment(equip)} className={chipBtn(homeEquipment.includes(equip))}>
                      <span>{equip}</span>
                      {homeEquipment.includes(equip) && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Preferences */}
            {currentStepId === "preferences" && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Preferencias y Limitaciones</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">Indicaciones extra procesadas rigurosamente por nuestro algoritmo.</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Ejercicios que querés evitar</label>
                    <input type="text" value={exercisesToAvoid} onChange={(e) => setExercisesToAvoid(e.target.value)}
                      placeholder="Ej: Peso muerto, squat libre, dominadas (opcional)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-white/40 text-sm placeholder-white/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase mb-2">Lesiones o limitaciones físicas</label>
                    <input type="text" value={injuriesOrLimitations} onChange={(e) => setInjuriesOrLimitations(e.target.value)}
                      placeholder="Ej: hernia discal L4-L5, tendinitis de hombro (opcional)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-white/40 text-sm placeholder-white/20"
                    />
                  </div>
                </div>

                <div className="mt-5 bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 mx-auto bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mb-3">
                    <Target className="w-6 h-6 text-brand" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">¿Algo más que el plan deba saber?</h3>
                  <p className="text-xs text-white/50 mb-4 leading-relaxed">
                    Zonas a priorizar, deportes que practicás, restricciones de movimiento...
                  </p>
                  <textarea
                    value={specificGoal}
                    onChange={(e) => setSpecificGoal(e.target.value)}
                    placeholder="Ej: Quiero priorizar glúteos y piernas, juego al tenis los sábados, no puedo hacer peso muerto por hernia"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-white/40 text-sm placeholder-white/20 text-left resize-none"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav controls */}
        {step > 1 && (
          <div className="flex items-center justify-between gap-4 mt-8">
            <button onClick={handleBack}
              className="px-6 py-4 rounded-xl font-semibold border border-white/10 hover:bg-white/5 text-white/60 transition-all flex items-center gap-1 text-sm"
              id="back-step-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
            <motion.button
              whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`flex-1 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-1 text-sm text-black ${
                isStepValid()
                  ? "bg-brand hover:bg-lime-400 shadow-md cursor-pointer"
                  : "bg-white/10 border border-white/10 text-white/30 cursor-not-allowed"
              }`}
              id="next-step-btn"
            >
              {step === totalSteps ? "Generar mi Plan" : "Siguiente"}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};
