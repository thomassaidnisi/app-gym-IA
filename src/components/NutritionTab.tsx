import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Apple, Loader2, RefreshCw, AlertTriangle, Flame,
  Beef, Wheat, Droplet, Sunrise, Coffee, UtensilsCrossed, Zap,
} from "lucide-react";
import { UserProfile, NutritionGuide } from "../types";
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

export const NutritionTab: React.FC<NutritionTabProps> = ({ profile }) => {
  const { user } = useAuth();
  const [guide, setGuide] = useState<NutritionGuide | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
              return (
                <div
                  key={i}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}
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
