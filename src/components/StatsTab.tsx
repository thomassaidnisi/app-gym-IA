import React, { useState, useEffect } from "react";
import { DailyStats, ExerciseLog } from "../types";
import { BarChart2, Check, Droplet, Award } from "lucide-react";
import { motion } from "motion/react";

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
  brand:   "var(--color-brand)",
};

export const StatsTab: React.FC = () => {
  const getTodayStr = () => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [weightInput, setWeightInput] = useState<string>("");
  const [sleepInput, setSleepInput] = useState<string>("");
  const [currentStats, setCurrentStats] = useState<DailyStats>({ weight: undefined, sleep: undefined, sleep_quality: "", water: 0 });
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [recentLogs, setRecentLogs] = useState<ExerciseLog[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  useEffect(() => {
    loadDailyStats(selectedDate);
    loadRecentLogs();
    loadMonthAttendance();
  }, [selectedDate, currentYear, currentMonth]);

  const loadDailyStats = (dateStr: string) => {
    const stored = localStorage.getItem(`stats_${dateStr}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DailyStats;
        setCurrentStats(parsed);
        setWeightInput(parsed.weight ? String(parsed.weight) : "");
        setSleepInput(parsed.sleep ? String(parsed.sleep) : "");
      } catch (e) { console.error(e); }
    } else {
      setCurrentStats({ weight: undefined, sleep: undefined, sleep_quality: "", water: 0 });
      setWeightInput("");
      setSleepInput("");
    }
  };

  const saveDailyStats = (updated: DailyStats) => {
    localStorage.setItem(`stats_${selectedDate}`, JSON.stringify(updated));
    setCurrentStats(updated);
  };

  const handleUpdateWeight = () => {
    const val = parseFloat(weightInput);
    if (!isNaN(val) && val > 0) { saveDailyStats({ ...currentStats, weight: val }); triggerSuccessToast(); }
  };

  const handleUpdateSleep = () => {
    const val = parseFloat(sleepInput);
    if (!isNaN(val) && val >= 0) { saveDailyStats({ ...currentStats, sleep: val }); triggerSuccessToast(); }
  };

  const handleUpdateSleepQuality = (quality: "Malo" | "Regular" | "Bien" | "Excelente") => {
    saveDailyStats({ ...currentStats, sleep_quality: quality }); triggerSuccessToast();
  };

  const handleUpdateWater = (cups: number) => saveDailyStats({ ...currentStats, water: cups });

  const triggerSuccessToast = () => {
    const toast = document.getElementById("stats-success-toast");
    if (toast) {
      toast.classList.remove("opacity-0", "translate-y-2");
      toast.classList.add("opacity-100", "translate-y-0");
      setTimeout(() => { toast.classList.add("opacity-0", "translate-y-2"); toast.classList.remove("opacity-100", "translate-y-0"); }, 2500);
    }
  };

  const loadMonthAttendance = () => {
    const cache: Record<string, boolean> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gym_") && localStorage.getItem(key) === "true") cache[key] = true;
    }
    setAttendance(cache);
  };

  const toggleAttendance = (dayNum: number) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
    const attendKey = `gym_${dateStr}`;
    const newVal = !attendance[attendKey];
    if (newVal) localStorage.setItem(attendKey, "true"); else localStorage.removeItem(attendKey);
    setAttendance((prev) => { const u = { ...prev }; if (newVal) u[attendKey] = true; else delete u[attendKey]; return u; });
  };

  const loadRecentLogs = () => {
    const list: ExerciseLog[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("log_")) {
        const parts = key.split("_");
        if (parts.length >= 3) {
          const date = parts[1];
          const exerciseName = parts.slice(2).join("_");
          list.push({ id: key, date, exerciseName, weight: localStorage.getItem(key) || "" });
        }
      }
    }
    list.sort((a, b) => b.date.localeCompare(a.date));
    setRecentLogs(list.slice(0, 6));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; };
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfWeek(currentYear, currentMonth);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); } else setCurrentMonth((m) => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); } else setCurrentMonth((m) => m + 1); };

  const inputCls = "w-full rounded-xl px-2.5 py-2 text-center text-sm focus:outline-none";
  const checkBtnCls = "p-2 rounded-xl transition-all flex items-center justify-center shrink-0 w-9";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 pt-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-extrabold tracking-tight select-none" style={{ color: T.textPri }}>Registros & Stats</h1>
        </div>
        <p className="text-xs tracking-wide mt-1" style={{ color: T.textSec }}>Monitorea tus KPIs de salud y progreso neuromuscular</p>
      </div>

      {/* Date selector */}
      <div className="rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <div>
          <h3 className="text-xs font-bold" style={{ color: T.textPri }}>Fecha del registro</h3>
          <p className="text-[11px] mt-0.5" style={{ color: T.textSec }}>Introduce datos físicos para este día en particular</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl px-4 py-2 text-xs focus:outline-none"
          style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
        />
      </div>

      {/* Weight & Sleep */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-3xl p-4 shadow-sm flex flex-col justify-between" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
          <div>
            <span className="text-[10px] uppercase block mb-1" style={{ color: T.textTer }}>Peso Corporal</span>
            <div className="flex items-baseline gap-1 select-none">
              <span className="font-bold text-3xl tabular-nums" style={{ color: T.textPri }}>{currentStats.weight ?? "--"}</span>
              <span className="text-xs" style={{ color: T.textSec }}>kg</span>
            </div>
            <p className="text-[10px] leading-snug mt-1" style={{ color: T.textSec }}>Registra tu peso corporal hoy.</p>
          </div>
          <div className="mt-4 flex gap-1.5">
            <input
              type="number" step="0.1" inputMode="decimal"
              value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
              placeholder="75.5"
              className={inputCls}
              style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
            />
            <button onClick={handleUpdateWeight} title="Guardar peso" className={checkBtnCls}
              style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
              <Check className="w-4 h-4 text-brand" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl p-4 shadow-sm flex flex-col justify-between" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
          <div>
            <span className="text-[10px] uppercase block mb-1" style={{ color: T.textTer }}>Horas de Sueño</span>
            <div className="flex items-baseline gap-1 select-none">
              <span className="font-bold text-3xl tabular-nums" style={{ color: T.textPri }}>{currentStats.sleep ?? "--"}</span>
              <span className="text-xs" style={{ color: T.textSec }}>hrs</span>
            </div>
            <p className="text-[10px] leading-snug mt-1" style={{ color: T.textSec }}>Sostén 7-8 horas para regenerar el SNC.</p>
          </div>
          <div className="mt-4 flex gap-1.5">
            <input
              type="number" step="0.5" inputMode="decimal"
              value={sleepInput} onChange={(e) => setSleepInput(e.target.value)}
              placeholder="7.5"
              className={inputCls}
              style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}
            />
            <button onClick={handleUpdateSleep} title="Guardar horas de sueño" className={checkBtnCls}
              style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
              <Check className="w-4 h-4 text-brand" />
            </button>
          </div>
        </div>
      </div>

      {/* Sleep quality */}
      <div className="rounded-3xl p-5 mb-6 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <h4 className="text-xs uppercase tracking-wider font-bold mb-3 select-none" style={{ color: T.textPri }}>
          Calidad de tu descanso nocturno
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {[{ label: "Malo", icon: "😴" }, { label: "Regular", icon: "😐" }, { label: "Bien", icon: "🙂" }, { label: "Excelente", icon: "😁" }].map((item) => (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUpdateSleepQuality(item.label as any)}
              className="py-3 px-1 rounded-xl text-xs flex flex-col items-center justify-center border transition-all"
              style={currentStats.sleep_quality === item.label
                ? { backgroundColor: T.textPri, borderColor: T.textPri, color: T.bg, transform: "scale(1.03)" }
                : { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }
              }
            >
              <span className="text-lg block mb-1">{item.icon}</span>
              <span className="text-[9px] font-bold tracking-wider uppercase">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Water */}
      <div className="rounded-3xl p-5 mb-6 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-3 select-none">
          <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: T.textPri }}>Hidratación Diaria</h4>
          <span className="font-bold text-xs" style={{ color: T.textPri }}>{currentStats.water || 0} / 8 vasos</span>
        </div>
        <p className="text-[10px] leading-snug mb-4" style={{ color: T.textSec }}>
          La deshidratación disminuye la contracción de actina-miosina hasta un 25%.
        </p>
        <div className="flex items-center justify-between gap-1 max-w-sm mx-auto">
          {Array.from({ length: 8 }).map((_, idx) => {
            const cupNum = idx + 1;
            const isFilled = (currentStats.water || 0) >= cupNum;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleUpdateWater(isFilled ? cupNum - 1 : cupNum)}
                className="py-3 gap-1 rounded-xl transition-all flex flex-col items-center justify-center flex-1"
                style={isFilled
                  ? { backgroundColor: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.4)", transform: "scale(1.05)" }
                  : { backgroundColor: T.bgSec, border: `1px solid ${T.border}` }
                }
              >
                <Droplet className={`w-4 h-4 ${isFilled ? "text-sky-400 fill-sky-400" : ""}`} style={!isFilled ? { color: T.textTer } : {}} />
                <span className="text-[8px]" style={{ color: isFilled ? "rgba(14,165,233,1)" : T.textTer }}>{cupNum}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-3xl p-5 mb-6 shadow-sm select-none" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: T.textPri }}>Asistencia al Gym</h4>
            <p className="text-[10px] leading-snug mt-0.5" style={{ color: T.textSec }}>Tocá el calendario para marcar entrenamiento</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="p-1 rounded-lg text-[10px] px-2 font-bold transition-all" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>◀</button>
            <span className="text-xs font-bold min-w-[80px] text-center uppercase px-2 py-1 rounded-lg" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textPri }}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg text-[10px] px-2 font-bold transition-all" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>▶</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase font-bold mb-2" style={{ color: T.textTer }}>
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDayOffset }).map((_, idx) => <div key={`offset-${idx}`} className="h-9 opacity-0" />)}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const pad = (n: number) => n.toString().padStart(2, "0");
            const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
            const isAttended = attendance[`gym_${dateStr}`] === true;
            const isSelected = selectedDate === dateStr;
            return (
              <motion.button
                key={`day-${dayNum}`}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleAttendance(dayNum)}
                className="h-9 w-full rounded-lg flex flex-col items-center justify-center relative transition-all"
                style={isAttended
                  ? { backgroundColor: "rgba(200,241,53,0.15)", border: `1px solid ${T.brand}`, color: T.brand, fontWeight: 700 }
                  : isSelected
                  ? { backgroundColor: T.textPri, border: `1px solid ${T.textPri}`, color: T.bg, fontWeight: 500 }
                  : { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }
                }
              >
                <span className="text-[11px]">{dayNum}</span>
                {isAttended && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent logs */}
      <div className="rounded-3xl p-5 mb-4 shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        <h4 className="text-xs uppercase tracking-wider font-bold mb-3 select-none" style={{ color: T.textPri }}>
          Historial de Cargas Recientes
        </h4>
        {recentLogs.length > 0 ? (
          <div className="overflow-hidden rounded-2xl select-text" style={{ border: `1px solid ${T.border}` }}>
            <table className="w-full text-[11px] text-left">
              <thead className="text-[9px] uppercase tracking-wider select-none" style={{ backgroundColor: T.bgSec, color: T.textTer }}>
                <tr>
                  <th className="p-3">Ejercicio</th>
                  <th className="p-3">Carga</th>
                  <th className="p-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr key={log.id} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                    <td className="p-3 font-semibold break-words pr-2 max-w-[150px]" style={{ color: T.textPri }}>{log.exerciseName}</td>
                    <td className="p-3 font-bold" style={{ color: T.textPri }}>{log.weight}</td>
                    <td className="p-3 text-right" style={{ color: T.textSec }}>{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 rounded-2xl p-4 select-none" style={{ backgroundColor: T.bgSec, border: `1px dashed ${T.border}` }}>
            <Award className="w-8 h-8 block mx-auto mb-2" style={{ color: T.textTer }} />
            <p className="text-xs leading-relaxed max-w-[200px] mx-auto" style={{ color: T.textSec }}>
              Aún no has registrado cargas. Expande ejercicios en Gym y presioná "Grabar".
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      <div
        id="stats-success-toast"
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 opacity-0 translate-y-2 z-50 text-xs font-semibold py-2.5 px-4 rounded-full flex items-center gap-1.5 shadow-xl transition-all duration-300 pointer-events-none"
        style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri }}
      >
        <Check className="w-4 h-4 text-brand" />
        KPIs grabados con éxito
      </div>
    </div>
  );
};
