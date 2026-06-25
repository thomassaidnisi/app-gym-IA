import React, { useState, useEffect, useRef } from "react";
import { Sun, Play, Pause, RotateCcw, Sparkles, Droplet, Flame, Compass } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
};

export const MorningTab: React.FC = () => {
  const [medActive, setMedActive] = useState(false);
  const [medTimeLeft, setMedTimeLeft] = useState(300);
  const [medPreset, setMedPreset] = useState(300);
  const medIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [routineTimeLeft, setRoutineTimeLeft] = useState(0);
  const [routineActive, setRoutineActive] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const routineIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (medActive) {
      medIntervalRef.current = setInterval(() => {
        setMedTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(medIntervalRef.current!); setMedActive(false); playTone(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (medIntervalRef.current) clearInterval(medIntervalRef.current);
    }
    return () => { if (medIntervalRef.current) clearInterval(medIntervalRef.current); };
  }, [medActive]);

  useEffect(() => {
    if (routineActive) {
      routineIntervalRef.current = setInterval(() => {
        setRoutineTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(routineIntervalRef.current!); setRoutineActive(false); playTone(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (routineIntervalRef.current) clearInterval(routineIntervalRef.current);
    }
    return () => { if (routineIntervalRef.current) clearInterval(routineIntervalRef.current); };
  }, [routineActive]);

  const playTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) { console.error(e); }
  };

  const handleMedPreset = (sec: number) => { setMedActive(false); setMedPreset(sec); setMedTimeLeft(sec); };

  const startRoutineTimer = (id: string, mins: number) => {
    if (activeRoutineId === id && routineActive) {
      setRoutineActive(false);
    } else if (activeRoutineId === id && !routineActive && routineTimeLeft > 0) {
      setRoutineActive(true);
    } else {
      setRoutineActive(false); setActiveRoutineId(id); setRoutineTimeLeft(mins * 60);
      setTimeout(() => setRoutineActive(true), 50);
    }
  };

  const formatMinSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const routines = [
    {
      id: "mobil", title: "Movilidad Articular", durationMins: 5,
      icon: <Compass className="w-5 h-5 text-emerald-500" />, tag: "Artritis / Rigidez",
      description: "Rutina suave de engrase articular matinal para humectar los cartílagos del cuerpo.",
      steps: [
        "Rotación cervical suave y adaptada (1 min)",
        "Circunducción de hombros y escápulas hacia adelante y atrás (1.5 min)",
        "Giros lentos de cadera y rodillas en semicírculos (1.5 min)",
        "Flexo-extensión dorsal gato-camello en el tapete (1 min)",
      ],
    },
    {
      id: "activ", title: "Activación Neuromuscular", durationMins: 5,
      icon: <Flame className="w-5 h-5 text-orange-500" />, tag: "Fuerza / Core",
      description: "Prepárate para entrenar despertando tu sistema nervioso central sin generar fatiga previa.",
      steps: [
        "Estiramiento dinámico spider-man con rotación torácica (2 min)",
        "Core plancha frontal isométrica alternando toques de hombro (1.5 min)",
        "Glute bridges aguantando 2 segundos arriba con control (1.5 min)",
      ],
    },
    {
      id: "shwer", title: "Ducha de Contraste Criógeno", durationMins: 3,
      icon: <Droplet className="w-5 h-5 text-sky-500" />, tag: "Recuperación Vasomed",
      description: "Estimulación cardiaca combinando frío y calor extremo para regular el cortisol mañanero.",
      steps: [
        "Comienza con agua caliente reconfortante durante 60 segundos",
        "Pasa bruscamente a agua completamente helada y respira profundo durante 30 segundos",
        "Repite la secuencia 2 veces finalizando con agua helada tonificante",
      ],
    },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 pt-4">
        <div className="flex items-center gap-2">
          <Sun className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-extrabold tracking-tight select-none" style={{ color: T.textPri }}>
            Rutina Mañana
          </h1>
        </div>
        <p className="text-xs tracking-wide mt-1" style={{ color: T.textSec }}>
          Optimiza tus hormonas, mente y energía apenas te despiertas
        </p>
      </div>

      {/* Meditation Card */}
      <div className="rounded-3xl p-6 mb-6 shadow-md" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full select-none font-bold" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
              Mental Fitness
            </span>
            <h3 className="text-lg font-bold mt-2" style={{ color: T.textPri }}>Meditación Mindfulness</h3>
            <p className="text-xs leading-relaxed mt-0.5" style={{ color: T.textSec }}>
              Controla la amígdala cerebral e incrementa tu foco diario en solo minutos.
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-brand shrink-0" />
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center justify-center py-6 rounded-2xl mb-5 select-none" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
          <span className="text-5xl font-bold tabular-nums leading-none tracking-tight" style={{ color: T.textPri }}>
            {formatMinSec(medTimeLeft)}
          </span>
          <span className="text-[10px] tracking-widest uppercase mt-2" style={{ color: T.textTer }}>
            {medActive ? "Inhalá · Exhalá lentamente" : "Detenido"}
          </span>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-5 select-none">
          {[{ label: "5 Min", sec: 300 }, { label: "10 Min", sec: 600 }, { label: "15 Min", sec: 900 }, { label: "20 Min", sec: 1200 }].map((item) => (
            <button
              key={item.sec}
              onClick={() => handleMedPreset(item.sec)}
              className="py-2 px-1 rounded-xl text-[10px] font-bold border transition-all"
              style={medPreset === item.sec
                ? { backgroundColor: T.textPri, border: `1px solid ${T.textPri}`, color: T.bg }
                : { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setMedActive(!medActive)}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              medActive ? "" : "bg-brand hover:bg-lime-400 text-black"
            }`}
            style={medActive ? { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri } : {}}
          >
            {medActive ? (
              <><Pause className="w-3.5 h-3.5 fill-current" />Pausar Meditación</>
            ) : (
              <><Play className="w-3.5 h-3.5 fill-black" />Comenzar Meditación</>
            )}
          </motion.button>
          <button
            onClick={() => handleMedPreset(medPreset)}
            className="p-3.5 rounded-xl border transition-all flex items-center justify-center"
            style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
            title="Reiniciar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Routines */}
      <h3 className="text-[10px] uppercase tracking-wider font-bold mb-3 px-1" style={{ color: T.textTer }}>
        Protocolos físicos matinales
      </h3>
      <div className="space-y-3">
        {routines.map((rt) => {
          const isExpanded = expandedRoutine === rt.id;
          const isTimerRunning = activeRoutineId === rt.id && routineActive;
          const hasTimeRemaining = activeRoutineId === rt.id && routineTimeLeft > 0;

          return (
            <div
              key={rt.id}
              className="rounded-2xl overflow-hidden cursor-pointer shadow-sm transition-all"
              style={{
                backgroundColor: T.bg,
                border: `1px solid ${isExpanded ? T.textTer : T.border}`,
                boxShadow: isExpanded ? "0 2px 8px rgba(0,0,0,0.08)" : undefined,
              }}
            >
              <div className="p-4 flex items-center justify-between gap-3" onClick={() => setExpandedRoutine(isExpanded ? null : rt.id)}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
                    {rt.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: T.textPri }}>{rt.title}</h4>
                    <span className="text-[10px]" style={{ color: T.textSec }}>{rt.durationMins} min · {rt.tag}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeRoutineId === rt.id && routineTimeLeft > 0 && (
                    <span className="text-[11px] font-bold py-1 px-2.5 rounded-full" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}>
                      {formatMinSec(routineTimeLeft)}
                    </span>
                  )}
                  <span className="text-[10px] transition-transform" style={{ color: isExpanded ? T.textPri : T.textTer, transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.bgSec }} onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs leading-relaxed mb-4" style={{ color: T.textSec }}>{rt.description}</p>
                      <div className="space-y-2.5 mb-5 select-none">
                        {rt.steps.map((std, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textSec }}>
                              {idx + 1}
                            </span>
                            <p className="text-xs leading-snug" style={{ color: T.textSec }}>{std}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => startRoutineTimer(rt.id, rt.durationMins)}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                            isTimerRunning ? "" : "bg-brand hover:bg-lime-400 text-black"
                          }`}
                          style={isTimerRunning ? { backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri } : {}}
                        >
                          {isTimerRunning ? (
                            <><Pause className="w-3.5 h-3.5 fill-current" />Pausar</>
                          ) : hasTimeRemaining ? (
                            <><Play className="w-3.5 h-3.5 fill-black" />Continuar ({formatMinSec(routineTimeLeft)})</>
                          ) : (
                            <><Play className="w-3.5 h-3.5 fill-black" />Comenzar ({rt.durationMins}:00)</>
                          )}
                        </motion.button>
                        {hasTimeRemaining && (
                          <button
                            onClick={() => { setRoutineActive(false); setRoutineTimeLeft(rt.durationMins * 60); }}
                            className="px-3 py-2 rounded-xl transition-all"
                            style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textSec }}
                            title="Reiniciar"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
