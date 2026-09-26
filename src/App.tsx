
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Onboarding } from "./components/Onboarding";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { PlanWalkthrough } from "./components/PlanWalkthrough";
import { GymTab } from "./components/GymTab";
import { LibraryTab } from "./components/LibraryTab";
import { NutritionTab } from "./components/NutritionTab";
import { StatsTab } from "./components/StatsTab";
import { ProfileTab } from "./components/ProfileTab";
import { CoachTab } from "./components/CoachTab";
import { RestTimerProvider } from "./components/RestTimerContext";
import { RestTimerOverlay } from "./components/RestTimerOverlay";
import { ThemeProvider } from "./components/ThemeContext";
import { FullTrainingPlan, UserProfile, NutritionGuide, ProgressionSuggestion } from "./types";
import { Dumbbell, Apple, User, MessageSquare, BookOpen } from "lucide-react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { AuthScreen } from "./components/AuthScreen";
import { loadUserData, loadNutritionGuide, saveNutritionGuide, loadExerciseLogs, clearLocalUserCache } from "./lib/db";
import { getProgressionSuggestions } from "./lib/progression";

// Optimistic restore: leídos sincrónicamente en el primer render, antes de
// cualquier llamada a Supabase — así un reinicio de la PWA (ej. iOS matando el
// proceso en background) muestra el home de inmediato con lo último conocido,
// en vez de un splash/Onboarding mientras se espera la red.
function readCachedPlan(): FullTrainingPlan | null {
  try {
    const raw = localStorage.getItem("healty_plan");
    return raw ? (JSON.parse(raw) as FullTrainingPlan) : null;
  } catch {
    return null;
  }
}

function readCachedProfile(): UserProfile | null {
  try {
    const cached = localStorage.getItem("healty_profile");
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function AppContent() {
  const [plan, setPlan] = useState<FullTrainingPlan | null>(readCachedPlan);
  const [profile, setProfile] = useState<UserProfile | null>(readCachedProfile);
  const [nutritionGuide, setNutritionGuide] = useState<NutritionGuide | null>(null);
  const [coachSuggestions, setCoachSuggestions] = useState<ProgressionSuggestion[]>([]);
  const [coachInitialMessage, setCoachInitialMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"gym" | "library" | "nutricion" | "stats" | "profile" | "coach">("gym");
const [dataLoading, setDataLoading] = useState(true);
  // Solo relevante mientras no hay sesión: null = WelcomeScreen, si no AuthScreen en ese modo.
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  // Reapertura manual del walkthrough de pilares (botón en GymTab) — separado del
  // auto-show por walkthrough_seen, así no se re-marca ni se confunde con la primera vez.
  const [manualWalkthroughOpen, setManualWalkthroughOpen] = useState(false);


useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);

  const handlePlanGenerated = (newPlan: FullTrainingPlan, newProfile: UserProfile) => {
    setPlan(newPlan);
    setProfile(newProfile);
    setActiveTab("gym");
  };

  const handlePlanUpdated = (updatedPlan: FullTrainingPlan) => {
    setPlan(updatedPlan);
    localStorage.setItem("healty_plan", JSON.stringify(updatedPlan));
  };

  const handleRegenerate = () => {
    localStorage.removeItem("healty_plan");
    setPlan(null);
    setActiveTab("gym");
  };

  const handleProfileUpdated = (updated: UserProfile) => setProfile(updated);

  const handleNutritionUpdated = (updatedGuide: NutritionGuide) => {
    setNutritionGuide(updatedGuide);
    if (user) saveNutritionGuide(user.id, updatedGuide).catch(console.error);
  };

  const handleOpenCoachWithMessage = (initialMessage: string) => {
    setCoachInitialMessage(initialMessage);
    setActiveTab("coach");
  };

  const { user, isLoading, isPasswordRecovery } = useAuth();

  // Rastrea el user.id anterior para detectar cambio de usuario (no solo login/logout)
  // y limpiar el caché de ese usuario antes de cargar los datos del nuevo.
  const prevUserIdRef = useRef<string | null>(null);

useEffect(() => {
  const prevUserId = prevUserIdRef.current;
  const newUserId = user?.id ?? null;
  if (prevUserId && prevUserId !== newUserId) {
    // El usuario logueado cambió (o cerró sesión por una vía que no pasó por
    // signOut() de AuthContext, ej. token expirado) — limpiar el caché del
    // usuario anterior antes de tocar el estado de plan/profile.
    clearLocalUserCache();
    setPlan(null);
    setProfile(null);
  }
  prevUserIdRef.current = newUserId;

  if (!user) { setDataLoading(false); return; }
  // Reset explícito: si veníamos de un render sin usuario (dataLoading ya en false),
  // sin esto habría un render intermedio con user truthy + dataLoading stale-false +
  // plan/profile aún null, que caía en la rama de Onboarding — el flash reportado.
  setDataLoading(true);
  Promise.all([
    loadUserData(user.id),
    loadNutritionGuide(user.id),
    loadExerciseLogs(user.id),
  ]).then(([{ profile: remoteProfile, plan: remotePlan }, remoteGuide, exerciseLogs]) => {
    if (remoteProfile) setProfile(remoteProfile);
    if (remotePlan) setPlan(remotePlan);
    if (remoteGuide) setNutritionGuide(remoteGuide);
    setCoachSuggestions(getProgressionSuggestions(exerciseLogs));

    // Supabase respondió pero sin perfil/plan — puede ser un usuario nuevo genuino,
    // o una falla lógica silenciosa (RLS/timing en una sesión recién restaurada; los
    // métodos de supabase-js no rechazan la promesa en estos casos, solo devuelven
    // data: null). Si hay caché local, usarla evita mandar a un usuario existente
    // de vuelta al onboarding.
    if (!remoteProfile || !remotePlan) {
      const cp = localStorage.getItem("healty_plan");
      const cpr = localStorage.getItem("healty_profile");
      if (!remotePlan && cp) try { setPlan(JSON.parse(cp)); } catch {}
      if (!remoteProfile && cpr) try { setProfile(JSON.parse(cpr)); } catch {}
    }
  }).catch(() => {
    // Network/fetch error → fall back to localStorage so existing sessions don't break
    const cp = localStorage.getItem("healty_plan");
    const cpr = localStorage.getItem("healty_profile");
    if (cp) try { setPlan(JSON.parse(cp)); } catch {}
    if (cpr) try { setProfile(JSON.parse(cpr)); } catch {}
  }).finally(() => setDataLoading(false));
}, [user]);

// Mientras se resuelve el estado de auth, no renderizar ninguna pantalla de
// contenido (ni Welcome, ni Onboarding, ni home) — solo un splash mínimo.
if (isLoading) {
  return <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }} />;
}

if (isPasswordRecovery) {
  return <AuthScreen />;
}

if (!user) {
  if (authMode) {
    return <AuthScreen initialMode={authMode} />;
  }
  return (
    <WelcomeScreen
      onLogin={() => setAuthMode("login")}
      onSignup={() => setAuthMode("signup")}
    />
  );
}

// Restauración optimista: si ya tenemos plan+perfil (de localStorage, leídos
// sincrónicamente al montar, o de un fetch previo) los mostramos de inmediato
// y dejamos que Supabase actualice en silencio en background — nunca bloqueamos
// el home ya conocido esperando a la red (esto es lo que evita la pantalla en
// blanco / vuelta al Onboarding cuando iOS mata y recarga la PWA).
if (!plan || !profile) {
  // Sin plan/perfil todavía (usuario nuevo, o cache local vacía) — ahí sí hace
  // falta esperar a Supabase antes de decidir Onboarding vs. mostrar datos.
  if (dataLoading) {
    return <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }} />;
  }
  return (
      <ThemeProvider>
        <div className="w-full min-h-[100dvh] bg-black text-white px-4 md:px-0 safe-pt pb-10">
          <div className="max-w-lg mx-auto">
            <Onboarding onPlanGenerated={handlePlanGenerated} />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <RestTimerProvider>
        <div
          className="w-full min-h-[100dvh] px-4 md:px-0"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <main className="relative max-w-lg mx-auto pb-28 pt-4">
 {/* Profile button — global, visible en todos los tabs excepto Gym (que ya muestra el avatar en su hero) */}
            {activeTab !== "gym" && (
              <button
                onClick={() => setActiveTab("profile")}
                className="absolute top-5 right-0 z-20 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold select-none transition-all overflow-hidden"
                style={{
                  backgroundColor: activeTab === "profile" ? "var(--color-brand)" : "var(--text-primary)",
                  color: activeTab === "profile" ? "#000" : "var(--bg-primary)",
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  (profile.name || "A").charAt(0).toUpperCase()
                )}
              </button>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                {activeTab === "gym" && (
                  <GymTab
                    plan={plan}
                    profile={profile}
                    coachSuggestions={coachSuggestions}
                    onOpenCoach={handleOpenCoachWithMessage}
                    onOpenProfile={() => setActiveTab("profile")}
                    onProfileUpdated={handleProfileUpdated}
                    onOpenWalkthrough={() => setManualWalkthroughOpen(true)}
                  />
                )}
                {activeTab === "library" && <LibraryTab />}
                {activeTab === "nutricion" && <NutritionTab profile={profile} />}
                {activeTab === "coach" && (
                  <CoachTab
                    plan={plan}
                    profile={profile}
                    onPlanUpdated={handlePlanUpdated}
                    onProfileUpdated={handleProfileUpdated}
                    nutritionGuide={nutritionGuide}
                    onNutritionUpdated={handleNutritionUpdated}
                    initialMessage={coachInitialMessage}
                  />
                )}
                {activeTab === "stats" && (
                  <StatsTab plan={plan} profile={profile} onProfileUpdated={handleProfileUpdated} />
                )}
                {activeTab === "profile" && (
                  <ProfileTab
                    plan={plan}
                    profile={profile}
                    onRegenerate={handleRegenerate}
                    onProfileUpdated={handleProfileUpdated}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

         <div
  className="fixed bottom-0 left-0 right-0 z-40 px-4 select-none"
  style={{
    background: "var(--nav-bg)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid var(--nav-border)",
    paddingBottom: "env(safe-area-inset-bottom)",
  }}
>
 <nav className="max-w-lg mx-auto h-16 grid grid-cols-5 items-center justify-items-center">
              {(
                [
                  { id: "gym",     Icon: Dumbbell,     label: "Gym" },
                  { id: "library", Icon: BookOpen,      label: "Library" },
                  { id: "coach",   Icon: MessageSquare, label: "Coach" },
                  { id: "nutricion", Icon: Apple,       label: "Nutrición" },
                  { id: "stats",   Icon: User,          label: "Yo" },
                ] as const
              ).map(({ id, Icon, label }) =>
                id === "coach" ? (
                  <button
                    key="coach"
                    onClick={() => setActiveTab("coach")}
                    className="flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors"
                    id="nav-coach-tab"
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
                      style={{
                        backgroundColor: activeTab === "coach"
                          ? "var(--color-brand)"
                          : "rgba(200,241,53,0.10)",
                      }}
                    >
                      <MessageSquare
                        className="w-6 h-6"
                        style={{ color: activeTab === "coach" ? "#000" : "var(--text-primary)" }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: activeTab === "coach" ? "var(--color-brand)" : "var(--text-tertiary)" }}
                    >
                      Coach
                    </span>
                  </button>
                ) : (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="flex flex-col items-center justify-center w-full h-full text-center transition-colors"
                    style={{
                      color: activeTab === id ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}
                    id={`nav-${id}-tab`}
                  >
                    <Icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                  </button>
                )
              )}
            </nav>
          </div>

          <RestTimerOverlay />

          {(() => {
            const shouldAutoShow = !!profile.plan_pillars && !profile.walkthrough_seen;
            if (!profile.plan_pillars || (!shouldAutoShow && !manualWalkthroughOpen)) return null;
            return (
              <PlanWalkthrough
                pillars={profile.plan_pillars}
                readOnly={!shouldAutoShow}
                onClose={() => {
                  if (shouldAutoShow) setProfile((p) => (p ? { ...p, walkthrough_seen: true } : p));
                  setManualWalkthroughOpen(false);
                }}
              />
            );
          })()}
        </div>
      </RestTimerProvider>
    </ThemeProvider>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}