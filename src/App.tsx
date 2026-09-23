
import React, { useState, useEffect } from "react";
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
import { Dumbbell, Apple, BarChart2, User as UserIcon, MessageSquare, BookOpen } from "lucide-react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { AuthScreen } from "./components/AuthScreen";
import { loadUserData, loadNutritionGuide, saveNutritionGuide, loadExerciseLogs } from "./lib/db";
import { getProgressionSuggestions } from "./lib/progression";

function AppContent() {
  const [plan, setPlan] = useState<FullTrainingPlan | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nutritionGuide, setNutritionGuide] = useState<NutritionGuide | null>(null);
  const [coachSuggestions, setCoachSuggestions] = useState<ProgressionSuggestion[]>([]);
  const [coachInitialMessage, setCoachInitialMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"gym" | "library" | "nutricion" | "stats" | "profile" | "coach">("gym");
const [dataLoading, setDataLoading] = useState(true);
  // Solo relevante mientras no hay sesión: null = WelcomeScreen, si no AuthScreen en ese modo.
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);


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

useEffect(() => {
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

// Hay sesión: mientras se resuelven perfil/plan del usuario, splash — nunca
// mostrar Onboarding de forma transitoria mientras esto carga (era el flash reportado).
if (dataLoading) {
  return <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }} />;
}

  if (!plan || !profile) {
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
                {activeTab === "stats" && <StatsTab />}
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
                  { id: "stats",   Icon: BarChart2,     label: "Stats" },
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

          {console.log("walkthrough check:", { plan_pillars: profile?.plan_pillars, walkthrough_seen: profile?.walkthrough_seen })}
          {profile.plan_pillars && profile.plan_pillars.length > 0 && !profile.walkthrough_seen && (
            <PlanWalkthrough
              pillars={profile.plan_pillars}
              onClose={() => setProfile((p) => (p ? { ...p, walkthrough_seen: true } : p))}
            />
          )}
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