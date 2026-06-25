import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Search, X, Dumbbell } from "lucide-react";

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
  brand:   "var(--color-brand)",
};

interface LibraryExercise {
  id: string;
  name: string;
  force: "push" | "pull" | "static" | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: "compound" | "isolation" | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

interface LibraryResponse {
  exercises: LibraryExercise[];
  total: number;
  page: number;
  totalPages: number;
}

const CATEGORY_CHIPS = [
  { label: "Todos",        value: "" },
  { label: "Fuerza",       value: "strength" },
  { label: "Cardio",       value: "cardio" },
  { label: "Estiramiento", value: "stretching" },
  { label: "Pliometría",   value: "plyometrics" },
];

const LEVEL_CHIPS = [
  { label: "Principiante", value: "beginner",     bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  text: "rgb(34,197,94)" },
  { label: "Intermedio",   value: "intermediate", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", text: "rgb(251,191,36)" },
  { label: "Avanzado",     value: "expert",       bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  text: "rgb(239,68,68)" },
];

const CATEGORY_LABEL: Record<string, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  stretching: "Estiramiento",
  plyometrics: "Pliometría",
  powerlifting: "Powerlifting",
  olympic_weightlifting: "Halterofilia",
  strongman: "Strongman",
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
};

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`} style={{ backgroundColor: T.bgSec }}>
        <Dumbbell className="w-8 h-8 opacity-25" style={{ color: T.textTer }} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
    >
      <div className="aspect-video w-full" style={{ backgroundColor: T.bgSec }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded-full w-4/5" style={{ backgroundColor: T.bgSec }} />
        <div className="h-3 rounded-full w-3/5" style={{ backgroundColor: T.bgSec }} />
        <div className="h-2.5 rounded-full w-2/5 mt-1" style={{ backgroundColor: T.bgSec }} />
      </div>
    </div>
  );
}

export const LibraryTab: React.FC = () => {
  const [search, setSearch]                       = useState("");
  const [category, setCategory]                   = useState("");
  const [level, setLevel]                         = useState("");
  const [exercises, setExercises]                 = useState<LibraryExercise[]>([]);
  const [total, setTotal]                         = useState(0);
  const [page, setPage]                           = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const [loading, setLoading]                     = useState(true);
  const [loadingMore, setLoadingMore]             = useState(false);
  const [selectedExercise, setSelectedExercise]   = useState<LibraryExercise | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = async (p: number, append: boolean, sq: string, cat: string, lvl: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (sq.trim())  params.set("search",   sq.trim());
    if (cat)        params.set("category", cat);
    if (lvl)        params.set("level",    lvl);

    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(`/api/exercise-library?${params}`);
      if (!res.ok) throw new Error("error fetching library");
      const data: LibraryResponse = await res.json();
      setExercises((prev) => append ? [...prev, ...data.exercises] : data.exercises);
      setTotal(data.total);
      setPage(p);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = search ? 350 : 0;
    debounceRef.current = setTimeout(() => doFetch(1, false, search, category, level), delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, category, level]);

  const handleLoadMore = () => doFetch(page + 1, true, search, category, level);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-extrabold tracking-tight select-none" style={{ color: T.textPri }}>
            Library
          </h1>
        </div>
        <p className="text-xs tracking-wide mt-1" style={{ color: T.textSec }}>
          Catálogo de ejercicios de referencia
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: T.textTer }}
        />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none"
          style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textPri }}
        />
      </div>

      {/* Category chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setCategory(chip.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              category === chip.value
                ? { backgroundColor: T.textPri, color: T.bg, border: `1px solid ${T.textPri}` }
                : { backgroundColor: T.bg, color: T.textSec, border: `1px solid ${T.border}` }
            }
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Level chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-4"
        style={{ scrollbarWidth: "none" }}
      >
        {LEVEL_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setLevel((prev) => (prev === chip.value ? "" : chip.value))}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              level === chip.value
                ? { backgroundColor: chip.bg, border: `1px solid ${chip.border}`, color: chip.text }
                : { backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textTer }
            }
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-[11px] mb-3 select-none" style={{ color: T.textTer }}>
          {total} ejercicio{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-12 h-12 mb-3 opacity-20" style={{ color: T.textTer }} />
          <p className="text-sm font-semibold" style={{ color: T.textSec }}>Sin resultados</p>
          <p className="text-xs mt-1" style={{ color: T.textTer }}>Probá con otra búsqueda o filtro</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {exercises.map((ex) => (
              <motion.button
                key={ex.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedExercise(ex)}
                className="rounded-2xl overflow-hidden text-left transition-all"
                style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
              >
                <div className="aspect-video w-full overflow-hidden">
                  <ImageWithFallback
                    src={ex.images[0]}
                    alt={ex.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p
                    className="text-xs font-semibold leading-snug"
                    style={{
                      color: T.textPri,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {ex.name}
                  </p>
                  <p className="text-[10px] mt-1 truncate" style={{ color: T.textTer }}>
                    {CATEGORY_LABEL[ex.category] ?? ex.category}
                    {ex.equipment ? ` · ${ex.equipment}` : ""}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          {page < totalPages && (
            <div className="mt-5 mb-2 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full text-xs font-bold transition-all"
                style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textSec }}
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={() => setSelectedExercise(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
              style={{ backgroundColor: T.bg, maxHeight: "90dvh" }}
            >
              {/* Hero image */}
              <div className="relative w-full aspect-video">
                <ImageWithFallback
                  src={selectedExercise.images[0]}
                  alt={selectedExercise.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedExercise(null)}
                  className="absolute top-3 right-3 rounded-full p-2 backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-5">
                <h2
                  className="text-lg font-extrabold leading-tight mb-3"
                  style={{ color: T.textPri }}
                >
                  {selectedExercise.name}
                </h2>

                {/* Chips row */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedExercise.category && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                    >
                      {CATEGORY_LABEL[selectedExercise.category] ?? selectedExercise.category}
                    </span>
                  )}
                  {selectedExercise.primaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                    >
                      {m}
                    </span>
                  ))}
                  {selectedExercise.equipment && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                    >
                      {selectedExercise.equipment}
                    </span>
                  )}
                  {(() => {
                    const lvl = LEVEL_CHIPS.find((l) => l.value === selectedExercise.level);
                    return lvl ? (
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: lvl.bg, border: `1px solid ${lvl.border}`, color: lvl.text }}
                      >
                        {LEVEL_LABEL[selectedExercise.level]}
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Secondary muscles */}
                {selectedExercise.secondaryMuscles.length > 0 && (
                  <div className="mb-4">
                    <h3
                      className="text-[10px] uppercase tracking-wider font-bold mb-2"
                      style={{ color: T.textTer }}
                    >
                      También trabaja
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedExercise.secondaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-full text-[10px]"
                          style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {selectedExercise.instructions.length > 0 && (
                  <div className="mb-8">
                    <h3
                      className="text-[10px] uppercase tracking-wider font-bold mb-3"
                      style={{ color: T.textTer }}
                    >
                      Cómo hacerlo
                    </h3>
                    <ol className="space-y-3">
                      {selectedExercise.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span
                            className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                            style={{
                              backgroundColor: T.bgSec,
                              border: `1px solid ${T.border}`,
                              color: T.textTer,
                            }}
                          >
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: T.textSec }}>
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
