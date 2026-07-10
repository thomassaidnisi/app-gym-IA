import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Apple, Loader2, RefreshCw, AlertTriangle, Flame,
  Beef, Wheat, Droplet, Sunrise, Coffee, UtensilsCrossed, Zap, Info,
} from "lucide-react";
import { UserProfile, NutritionGuide, NutritionDistribucionItem } from "../types";
import { useAuth } from "./AuthContext";
import { saveNutritionGuide, loadNutritionGuide } from "../lib/db";

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
  brand:   "var(--color-brand)",
  badgeBg: "var(--badge-bg)",
};

interface NutritionTabProps {
  profile: UserProfile;
}

function momentIcon(momento: string) {
  const m = momento.toLowerCase();
  if (m.includes("desayuno")) return Sunrise;
  if (m.includes("media mañana") || m.includes("merienda") || m.includes("snack")) return Coffee;
  if (m.includes("pre") || m.includes("post") || m.includes("entreno")) return Zap;
  if (m.includes("almuerzo") || m.includes("cena")) return UtensilsCrossed;
  return UtensilsCrossed;
}

const MACRO_COLORS = {
  proteina: "rgba(99,102,241,1)",
  carbos: "rgba(245,158,11,1)",
  grasas: "rgba(16,185,129,1)",
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArcStroke(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Full circle edge case: draw as two half-arcs so the path renders.
  if (endAngle - startAngle >= 359.99) {
    const p1 = polarToCartesian(cx, cy, r, startAngle);
    const p2 = polarToCartesian(cx, cy, r, startAngle + 180);
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${p2.x} ${p2.y} A ${r} ${r} 0 1 1 ${p1.x} ${p1.y}`;
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

const PlateChart: React.FC<{ macros: NonNullable<NutritionDistribucionItem["macros"]> }> = ({ macros }) => {
  const kcalProteina = macros.proteina_g * 4;
  const kcalCarbos = macros.carbohidratos_g * 4;
  const kcalGrasas = macros.grasas_g * 9;
  const total = kcalProteina + kcalCarbos + kcalGrasas;

  const slices = total > 0
    ? [
        { color: MACRO_COLORS.proteina, kcal: kcalProteina },
        { color: MACRO_COLORS.carbos, kcal: kcalCarbos },
        { color: MACRO_COLORS.grasas, kcal: kcalGrasas },
      ]
    : [];

  let angleCursor = 0;
  const cx = 60, cy = 60, r = 45, strokeWidth = 22;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[120px] h-[120px]">
        <svg width={120} height={120} viewBox="0 0 120 120">
          {slices.map((s, i) => {
            const sliceAngle = (s.kcal / total) * 360;
            const path = describeArcStroke(cx, cy, r, angleCursor, angleCursor + sliceAngle);
            angleCursor += sliceAngle;
            return (
              <motion.path
                key={i}
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                pathLength={100}
                strokeDasharray={100}
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.2 }}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={34} fill={T.bgSec} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black tabular-nums" style={{ color: T.textPri }}>
            {macros.calorias}
          </span>
          <span className="text-[9px]" style={{ color: T.textTer }}>kcal</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span
          className="text-[10px] font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8" }}
        >
          {macros.proteina_g}g Proteína
        </span>
        <span
          className="text-[10px] font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
        >
          {macros.carbohidratos_g}g Carbos
        </span>
        <span
          className="text-[10px] font-semibold rounded-full px-2 py-0.5"
          style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10b981" }}
        >
          {macros.grasas_g}g Grasas
        </span>
      </div>
    </div>
  );
};

export const NutritionTab: React.FC<NutritionTabProps> = ({ profile }) => {
  const { user } = useAuth();
  const [guide, setGuide] = useState<NutritionGuide | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedMoment, setExpandedMoment] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setIsLoadingGuide(false); return; }
    loadNutritionGuide(user.id)
      .then((g) => setGuide(g))
      .finally(() => setIsLoadingGuide(false));
  }, [user]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/generate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocurrió un error en el servidor.");
      }
      const generatedGuide: NutritionGuide = await response.json();
      setGuide(generatedGuide);
      if (user) {
        await saveNutritionGuide(user.id, generatedGuide);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Fallo al conectar con el servidor. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingGuide) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.textTer }} />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-20 gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(200,241,53,0.10)" }}
        >
          <Apple className="w-7 h-7" style={{ color: T.brand }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: T.textPri }}>Guía nutricional</h2>
          <p className="text-sm mt-1" style={{ color: T.textSec }}>
            Generá una guía personalizada de calorías y macros basada en tu perfil.
          </p>
        </div>
        {errorMsg && (
          <p className="text-sm" style={{ color: "#ef4444" }}>{errorMsg}</p>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-12 px-6 rounded-2xl font-black text-sm text-black flex items-center gap-2"
          style={{ backgroundColor: T.brand, opacity: isGenerating ? 0.6 : 1 }}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Apple className="w-4 h-4" />}
          {isGenerating ? "Generando..." : "Generar mi guía nutricional"}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Calorías destacadas */}
      <div
        className="rounded-3xl p-6 flex flex-col items-center text-center"
        style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-1.5 mb-1" style={{ color: T.textTer }}>
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-widest font-semibold">Calorías diarias</span>
        </div>
        <span className="text-6xl font-black tabular-nums" style={{ color: T.brand }}>
          {guide.calorias_diarias}
        </span>
        <span className="text-xs mt-1" style={{ color: T.textTer }}>
          TMB {guide.tmb_calculada} kcal · TDEE {guide.tdee_calculado} kcal · {guide.objetivo}
        </span>
      </div>

      {/* Aviso datos faltantes */}
      {guide.datos_faltantes.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)" }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#eab308" }} />
          <div className="text-xs" style={{ color: "#eab308" }}>
            {guide.datos_faltantes.map((d, i) => <p key={i}>{d}</p>)}
          </div>
        </div>
      )}

      {/* Macros */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Proteína",
            value: guide.macros.proteina_g,
            Icon: Beef,
            kcalPerG: 4,
            bg: "rgba(99,102,241,0.15)",
            border: "rgba(99,102,241,0.3)",
            color: "#818cf8",
          },
          {
            label: "Carbos",
            value: guide.macros.carbohidratos_g,
            Icon: Wheat,
            kcalPerG: 4,
            bg: "rgba(245,158,11,0.15)",
            border: "rgba(245,158,11,0.3)",
            color: "#f59e0b",
          },
          {
            label: "Grasas",
            value: guide.macros.grasas_g,
            Icon: Droplet,
            kcalPerG: 9,
            bg: "rgba(16,185,129,0.15)",
            border: "rgba(16,185,129,0.3)",
            color: "#10b981",
          },
        ].map((m) => {
          const pct = guide.calorias_diarias > 0
            ? Math.round((m.value * m.kcalPerG * 100) / guide.calorias_diarias)
            : 0;
          return (
            <div
              key={m.label}
              className="rounded-2xl p-4 flex flex-col items-center text-center"
              style={{ backgroundColor: m.bg, border: `1px solid ${m.border}` }}
            >
              <m.Icon className="w-5 h-5 mb-1.5" style={{ color: m.color }} />
              <span className="text-2xl font-black tabular-nums" style={{ color: T.textPri }}>{m.value}g</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: T.textSec }}>
                {m.label}
              </span>
              <span className="text-[10px] mt-0.5" style={{ color: T.textTer }}>{pct}% kcal</span>
            </div>
          );
        })}
      </div>

      {/* Distribución */}
      {guide.distribucion.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: T.textTer }}>
            Distribución diaria
          </h3>
          <div className="flex flex-col gap-2">
            {guide.distribucion.map((d, i) => {
              const Icon = momentIcon(d.momento);
              const isExpanded = expandedMoment === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-4 cursor-pointer select-none"
                  style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}
                  onClick={() => setExpandedMoment(isExpanded ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: T.brand }} />
                    <p className="text-sm font-bold" style={{ color: T.textPri }}>{d.momento}</p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: T.textSec }}>{d.descripcion}</p>
                  {d.ejemplos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.ejemplos.map((ej, j) => (
                        <span
                          key={j}
                          className="bg-white/5 rounded-full px-2 py-0.5 text-xs"
                          style={{ color: T.textSec }}
                        >
                          {ej}
                        </span>
                      ))}
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pt-4 mt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                          {d.razon && (
                            <div className="flex items-start gap-1.5 mb-3" style={{ opacity: 0.7 }}>
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: T.textSec }} />
                              <p className="text-xs" style={{ color: T.textSec }}>{d.razon}</p>
                            </div>
                          )}
                          {d.macros ? (
                            <PlateChart macros={d.macros} />
                          ) : (
                            <p className="text-xs text-center py-2" style={{ color: T.textTer }}>
                              Actualizá tu guía para ver el desglose por comida
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suplementos */}
      {guide.suplementos.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: T.textTer }}>
            Suplementos sugeridos
          </h3>
          <div className="flex flex-col gap-3">
            {guide.suplementos.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: T.textPri }}>{s.nombre}</p>
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ backgroundColor: T.badgeBg, color: T.textPri }}
                  >
                    {s.dosis}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: T.textTer }}>{s.motivo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {guide.notas.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}
        >
          <h3 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#eab308" }}>
            Notas
          </h3>
          <div className="flex flex-col gap-1.5">
            {guide.notas.map((n, i) => (
              <p key={i} className="text-xs" style={{ color: T.textSec }}>{n}</p>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-center" style={{ color: "#ef4444" }}>{errorMsg}</p>
      )}

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
        style={{
          color: T.textPri,
          border: `1px solid ${T.border}`,
          opacity: isGenerating ? 0.6 : 1,
        }}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {isGenerating ? "Actualizando..." : "Actualizar guía"}
      </motion.button>

      <p className="text-[10px] text-center leading-relaxed" style={{ color: T.textTer }}>
        {guide.disclaimer}
      </p>
    </div>
  );
};
