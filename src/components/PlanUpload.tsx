import React, { useState, useEffect, useRef } from "react";
import { UserProfile, FullTrainingPlan, DayPlan, ExerciseBlock, Exercise } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileUp, RefreshCw, ChevronLeft, Check, AlertTriangle, 
  AlertCircle, Trash2, Plus, Info, Upload, ChevronDown, ChevronUp, FileText
} from "lucide-react";

interface PlanUploadProps {
  profile: UserProfile;
  onBack: () => void;
  onPlanSaved: (plan: FullTrainingPlan) => void;
}

type SubState = "select" | "confirm" | "processing" | "review" | "success";

export const PlanUpload: React.FC<PlanUploadProps> = ({ profile, onBack, onPlanSaved }) => {
  const [subState, setSubState] = useState<SubState>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // API Response States
  const [parsedPlan, setParsedPlan] = useState<FullTrainingPlan | null>(null);
  const [inconsistencyWarning, setInconsistencyWarning] = useState<string | null>(null);
  
  // Interactive Editing States
  const [editablePlan, setEditablePlan] = useState<FullTrainingPlan | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing texts rotator
  const [processingTextIdx, setProcessingTextIdx] = useState(0);
  const processingPhrases = [
    "Leyendo tu plan...",
    "Identificando los ejercicios...",
    "Organizando series y repeticiones...",
    "Cruzando con tu perfil...",
    "Casi listo..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (subState === "processing") {
      interval = setInterval(() => {
        setProcessingTextIdx((prev) => (prev + 1) % processingPhrases.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [subState]);

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  // Click handler to open file dialog
  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const acceptedExtensions = [".pdf", ".xlsx", ".xls", ".csv"];
    
    if (!acceptedExtensions.includes(ext)) {
      setErrorMsg("Formato no soportado. Por favor sube un archivo PDF, XLSX, XLS o CSV.");
      return;
    }

    // Size limit: 10MB
    const limitBytes = 10 * 1024 * 1024;
    if (file.size > limitBytes) {
      setErrorMsg("El archivo supera el límite de 10MB. Sube un archivo más liviano.");
      return;
    }

    setSelectedFile(file);
    setSubState("confirm");
  };

  // Core API call: Send file to backend
  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;
    setSubState("processing");
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("profile", JSON.stringify(profile));

    try {
      const res = await fetch("/api/parse-plan-document", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al procesar el documento con la IA.");
      }

      const data = await res.json();
      if (!data.success || !data.parsed_plan) {
        throw new Error(data.error || "No pudimos extraer un plan de entrenamiento válido.");
      }

      const plan: FullTrainingPlan = data.parsed_plan;
      setParsedPlan(plan);
      setEditablePlan(plan);
      setInconsistencyWarning(data.inconsistency_warning || null);
      
      // Expand first day by default in review screen
      if (plan.days && plan.days.length > 0) {
        setExpandedDayId(plan.days[0].id);
      }
      setSubState("review");

    } catch (error: any) {
      console.error("Upload error:", error);
      setErrorMsg(error.message || "Hubo un problema de conexión con el servidor. Intenta de nuevo.");
      setSubState("select");
    }
  };

  // Interactive Edit Handlers
  const handleDayNameChange = (dayId: string, newName: string) => {
    if (!editablePlan) return;
    const updatedDays = editablePlan.days.map(d => {
      if (d.id === dayId) {
        return { ...d, name: newName };
      }
      return d;
    });
    setEditablePlan({ ...editablePlan, days: updatedDays });
  };

  const handleExerciseChange = (dayId: string, blockIdx: number, exerciseIdx: number, field: keyof Exercise, value: any) => {
    if (!editablePlan) return;
    const updatedDays = editablePlan.days.map(d => {
      if (d.id === dayId) {
        const updatedBlocks = d.blocks.map((b, bIdx) => {
          if (bIdx === blockIdx) {
            const updatedExercises = b.exercises.map((e, eIdx) => {
              if (eIdx === exerciseIdx) {
                return { ...e, [field]: value };
              }
              return e;
            });
            return { ...b, exercises: updatedExercises };
          }
          return b;
        });
        return { ...d, blocks: updatedBlocks };
      }
      return d;
    });
    setEditablePlan({ ...editablePlan, days: updatedDays });
  };

  const handleRemoveExercise = (dayId: string, blockIdx: number, exerciseIdx: number) => {
    if (!editablePlan) return;
    const updatedDays = editablePlan.days.map(d => {
      if (d.id === dayId) {
        const updatedBlocks = d.blocks.map((b, bIdx) => {
          if (bIdx === blockIdx) {
            const updatedExercises = b.exercises.filter((_, eIdx) => eIdx !== exerciseIdx);
            return { ...b, exercises: updatedExercises };
          }
          return b;
        }).filter(b => b.exercises.length > 0); // Cleanup blocks if empty
        return { ...d, blocks: updatedBlocks };
      }
      return d;
    });
    setEditablePlan({ ...editablePlan, days: updatedDays });
  };

  const handleAddExercise = (dayId: string, blockIdx: number) => {
    if (!editablePlan) return;
    const newEx: Exercise = {
      name: "Nuevo Ejercicio",
      muscles: ["General"],
      sets: 3,
      reps: "10-12",
      weight: "S/D",
      rest_seconds: 60,
      technique_tip: "Mantén un rango de movimiento completo y controlado.",
      common_error: "",
      youtube_url: ""
    };

    const updatedDays = editablePlan.days.map(d => {
      if (d.id === dayId) {
        const updatedBlocks = d.blocks.map((b, bIdx) => {
          if (bIdx === blockIdx) {
            return { ...b, exercises: [...b.exercises, newEx] };
          }
          return b;
        });
        return { ...d, blocks: updatedBlocks };
      }
      return d;
    });
    setEditablePlan({ ...editablePlan, days: updatedDays });
  };

  const handleAddDay = () => {
    if (!editablePlan) return;
    const newDayId = `day_${Date.now()}`;
    const newDay: DayPlan = {
      id: newDayId,
      name: `Nuevo Día ${editablePlan.days.length + 1}`,
      day_of_week: "Lunes",
      focus: "General",
      duration: "~60 min",
      warmup: [],
      blocks: [
        {
          type: "strength",
          is_superset: false,
          label: "Fuerza / Hipertrofia",
          title: "Bloque 1",
          exercises: [
            {
              name: "Sentadilla Goblet",
              muscles: ["Cuádriceps", "Glúteos"],
              sets: 3,
              reps: "10",
              weight: "S/D",
              rest_seconds: 60,
              technique_tip: "Mantén la espalda recta durante todo el recorrido.",
              common_error: "Levantar los talones del suelo",
              youtube_url: ""
            }
          ]
        }
      ],
      cooldown: []
    };

    setEditablePlan({
      ...editablePlan,
      days: [...editablePlan.days, newDay]
    });
    setExpandedDayId(newDayId);
  };

  // Final Action: Save plan to App context and LocalStorage
  const handleConfirmAndSave = () => {
    if (!editablePlan) return;
    
    // Set to success and trigger onboarding callback 
    setSubState("success");
    setTimeout(() => {
      onPlanSaved(editablePlan);
    }, 1500);
  };

  return (
    <div className="w-full max-w-md mx-auto text-neutral-100 px-4 py-2 select-none">
      
      {/* 1. SELECCIÓN DE ARCHIVO */}
      {subState === "select" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display text-3xl tracking-wider text-white uppercase">SUBIR MI PLAN</h2>
              <p className="text-xs text-neutral-400 font-sans">Digitaliza tu rutina actual y vuela más alto con el Coach IA</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dropzone Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleZoneClick}
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[250px] transition-all duration-200 ${
              isDragging 
                ? "border-brand bg-brand/5 scale-[1.01]" 
                : "border-neutral-800 bg-neutral-950/60 hover:border-brand/50 hover:bg-neutral-950"
            }`}
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
            />
            
            <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-brand mb-5 shadow">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>

            <p className="text-sm font-semibold text-white px-2">
              Arrastrá tu archivo aquí o tocá para seleccionar
            </p>
            <p className="text-xs text-neutral-500 mt-2 max-w-xs leading-relaxed">
              Soporta PDF o Excel (.xlsx, .xls, .csv)<br/>El plan original que te dio tu gimnasio o entrenador de confianza
            </p>

            <div className="flex gap-3 justify-center items-center mt-6">
              <span className="text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md uppercase">
                PDF
              </span>
              <span className="text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md uppercase">
                Excel
              </span>
              <span className="text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md uppercase">
                Image/Scanner
              </span>
            </div>
          </div>

          <p className="text-[10px] text-center text-neutral-500 font-mono uppercase tracking-wider">
            Límite de tamaño: 10MB por documento
          </p>
        </motion.div>
      )}

      {/* 2. CONFIRMAR ENVÍO */}
      {subState === "confirm" && selectedFile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl tracking-wider text-white uppercase leading-none">ARCHIVO ARCHIVADO</h2>
            <p className="text-neutral-400 text-xs">Preparado para digitalización automatizada con IA</p>
          </div>

          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUploadAndProcess}
              className="w-full relative overflow-hidden bg-brand hover:bg-brand/90 text-black py-4 rounded-2xl text-sm font-bold font-mono tracking-wider uppercase shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-black animate-spin-slow" />
              DIGITALIZAR MI PLAN
            </button>

            <button
              onClick={() => {
                setSelectedFile(null);
                setSubState("select");
              }}
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cambiar archivo
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. PROCESANDO (LOADING) */}
      {subState === "processing" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
          <div className="relative">
            {/* Visual spinning Ring */}
            <div className="w-24 h-24 rounded-full border-4 border-neutral-900 border-t-brand animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-neutral-950 rounded-full border border-neutral-900 flex items-center justify-center">
              <Upload className="w-6 h-6 text-brand animate-bounce" />
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <AnimatePresence mode="wait">
              <motion.h3
                key={processingTextIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="font-display text-4xl tracking-wider text-white uppercase leading-none"
              >
                {processingPhrases[processingTextIdx]}
              </motion.h3>
            </AnimatePresence>
            <p className="text-neutral-400 text-xs px-6">
              Gemini está extrayendo ejercicios, estructurando días y optimizando pesos. Esto tomará sólo unos segundos.
            </p>
          </div>
        </div>
      )}

      {/* 4. REVISIÓN Y CORRECCIÓN (The core screen) */}
      {subState === "review" && editablePlan && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-28"
        >
          <div className="space-y-1">
            <h2 className="font-display text-3xl tracking-wider text-white uppercase leading-none">REVISÁ TU PLAN</h2>
            <p className="text-neutral-400 text-xs">Verificá que la extracción de la IA sea correcta antes de guardar.</p>
          </div>

          {/* Banner de Alerta Inconsistencia */}
          {inconsistencyWarning && (
            <div className="p-4 bg-orange-950/40 border border-orange-850/60 rounded-2xl flex gap-3 text-xs text-orange-200">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-orange-400">Observación con tu Perfil</p>
                <p className="leading-relaxed font-sans">{inconsistencyWarning}</p>
              </div>
            </div>
          )}

          {/* Metadata simple config panel */}
          <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-4 space-y-4">
            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Nombre del Plan</label>
              <input
                type="text"
                value={editablePlan.plan_name}
                onChange={(e) => setEditablePlan({ ...editablePlan, plan_name: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">División</label>
                <input
                  type="text"
                  value={editablePlan.division}
                  onChange={(e) => setEditablePlan({ ...editablePlan, division: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/60"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Duración Sesión</label>
                <input
                  type="text"
                  value={editablePlan.session_duration}
                  onChange={(e) => setEditablePlan({ ...editablePlan, session_duration: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Días Extraídos Accordion */}
          <div className="space-y-3">
            <h3 className="font-display text-xl tracking-wider text-neutral-300 uppercase">Días Planificados</h3>
            
            {editablePlan.days.map((day) => {
              const isExpanded = expandedDayId === day.id;
              
              return (
                <div 
                  key={day.id}
                  className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden"
                >
                  {/* Accordion Trigger */}
                  <div 
                    onClick={() => setExpandedDayId(isExpanded ? null : day.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 select-none"
                  >
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        value={day.name}
                        onClick={(e) => e.stopPropagation()} // Prevent collapse toggling on input focus
                        onChange={(e) => handleDayNameChange(day.id, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-neutral-800 focus:border-brand text-sm font-semibold text-white focus:outline-none w-full py-0.5"
                      />
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase tracking-wider">
                        {day.focus || "Foco libre"} · {day.blocks.flatMap(b => b.exercises).length} Ejercicios
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-neutral-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-500 shrink-0" />
                    )}
                  </div>

                  {/* Accordion Content Block */}
                  {isExpanded && (
                    <div className="border-t border-neutral-900 p-4 space-y-4">
                      {day.blocks.map((block, blockIdx) => (
                        <div key={blockIdx} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-neutral-900 text-neutral-400 font-mono px-2 py-0.5 rounded-md uppercase border border-neutral-850">
                              {block.label || "Bloque de ejercicios"}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {block.exercises.map((exercise, exerciseIdx) => (
                              <div 
                                key={exerciseIdx}
                                className="bg-neutral-900/60 border border-neutral-850 p-3.5 rounded-xl space-y-3.5"
                              >
                                {/* Header with block number and Needs Review flag */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {exercise.needs_review && (
                                      <span className="text-yellow-500 text-xs font-bold font-mono uppercase bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                        ⚠️ Revisar
                                      </span>
                                    )}
                                    <input
                                      type="text"
                                      value={exercise.name}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "name", e.target.value)}
                                      className="bg-transparent border-b border-transparent hover:border-neutral-800 focus:border-brand text-xs font-semibold text-white focus:outline-none w-full"
                                    />
                                  </div>
                                  
                                  <button
                                    onClick={() => handleRemoveExercise(day.id, blockIdx, exerciseIdx)}
                                    className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                                    title="Eliminar ejercicio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Main inputs row */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">Series</label>
                                    <input
                                      type="number"
                                      value={exercise.sets}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "sets", parseInt(e.target.value) || 0)}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-2 text-xs text-center font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">Reps</label>
                                    <input
                                      type="text"
                                      value={exercise.reps}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "reps", e.target.value)}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-2 text-xs text-center font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">Peso</label>
                                    <input
                                      type="text"
                                      value={exercise.weight}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "weight", e.target.value)}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-2 text-xs text-center font-mono"
                                    />
                                  </div>
                                </div>

                                {/* Extra info: Tip of technique or muscles */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">Descanso (segundos)</label>
                                    <input
                                      type="number"
                                      value={exercise.rest_seconds}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "rest_seconds", parseInt(e.target.value) || 0)}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-2 text-xs font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">Músculos (separados por coma)</label>
                                    <input
                                      type="text"
                                      value={exercise.muscles.join(", ")}
                                      onChange={(e) => handleExerciseChange(day.id, blockIdx, exerciseIdx, "muscles", e.target.value.split(",").map(m => m.trim()))}
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-2 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => handleAddExercise(day.id, blockIdx)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-neutral-850 hover:border-brand/40 text-neutral-500 hover:text-brand/80 rounded-xl text-xs font-mono transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + AGREGAR EJERCICIO
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Day Button */}
          <button
            onClick={handleAddDay}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-800 hover:border-brand text-neutral-400 hover:text-brand rounded-2xl text-xs font-semibold transition-all cursor-pointer bg-neutral-950/40"
          >
            <Plus className="w-4 h-4" />
            + AGREGAR DÍA COMPLETO
          </button>

          {/* Fixed bottom controls for saving */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black to-black/10 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] px-4 border-t border-neutral-900/30">
            <div className="max-w-md mx-auto space-y-2">
              <button
                onClick={handleConfirmAndSave}
                className="w-full bg-brand text-black hover:bg-brand/90 py-3.5 rounded-2xl text-sm font-bold font-mono uppercase tracking-wider shadow-lg cursor-pointer"
              >
                CONFIRMAR Y GUARDAR PLAN
              </button>
              
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setEditablePlan(null);
                  setParsedPlan(null);
                  setSubState("select");
                }}
                className="block text-center text-[10px] text-neutral-500 hover:text-neutral-300 font-mono uppercase tracking-wider mx-auto transition-colors cursor-pointer"
              >
                Volver a subir el archivo
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. CONFIRMACIÓN */}
      {subState === "success" && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-brand text-black rounded-3xl flex items-center justify-center shadow"
          >
            <Check className="w-8 h-8 stroke-[3]" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="font-display text-4xl tracking-wider text-white uppercase leading-none">¡PLAN CARGADO!</h2>
            <p className="text-neutral-400 text-xs px-10">
              Rutina digitalizada y potenciada con IA. El coach ya tiene el contexto de tu entrenamiento original.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
