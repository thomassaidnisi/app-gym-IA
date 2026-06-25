
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Onboarding } from "./components/Onboarding";
import { GymTab } from "./components/GymTab";
import { LibraryTab } from "./components/LibraryTab";
import { MorningTab } from "./components/MorningTab";
import { StatsTab } from "./components/StatsTab";
import { ProfileTab } from "./components/ProfileTab";
import { CoachTab } from "./components/CoachTab";
import { RestTimerProvider } from "./components/RestTimerContext";
import { RestTimerOverlay } from "./components/RestTimerOverlay";
import { ThemeProvider } from "./components/ThemeContext";
import { FullTrainingPlan, UserProfile } from "./types";
import { Dumbbell, Sun, BarChart2, User as UserIcon, MessageSquare, BookOpen } from "lucide-react";

export default function App() {
  const [plan, setPlan] = useState<FullTrainingPlan | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"gym" | "library" | "morning" | "stats" | "profile" | "coach">("gym");

  useEffect(() => {
    const cachedPlan = localStorage.getItem("healty_plan");
    const cachedProfile = localStorage.getItem("healty_profile");
    if (cachedPlan) {
      try { setPlan(JSON.parse(cachedPlan)); } catch (e) { console.error(e); }
    }
    if (cachedProfile) {
      try { setProfile(JSON.parse(cachedProfile)); } catch (e) { console.error(e); }
    }
  }, []);

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

  if (!plan || !profile) {
    return (
      <ThemeProvider>
        <div className="w-full min-h-screen bg-black text-white px-4 md:px-0 safe-pt pb-10">
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
          className="w-full min-h-screen px-4 md:px-0"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <main className="relative max-w-lg mx-auto pb-28 pt-4">
 {/* Profile button — global, visible en todos los tabs */}
            <button
              onClick={() => setActiveTab("profile")}
              className="absolute top-4 right-0 z-20 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold select-none transition-all"
              style={{
                backgroundColor: activeTab === "profile" ? "var(--color-brand)" : "var(--text-primary)",
                color: activeTab === "profile" ? "#000" : "var(--bg-primary)",
              }}
            >
              {(profile.name || "A").charAt(0).toUpperCase()}
            </button>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                {activeTab === "gym" && <GymTab plan={plan} profile={profile} />}
                {activeTab === "library" && <LibraryTab />}
                {activeTab === "morning" && <MorningTab />}
                {activeTab === "coach" && (
                  <CoachTab plan={plan} profile={profile} onPlanUpdated={handlePlanUpdated} />
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
            className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-4 select-none pb-safe"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
 <nav className="max-w-lg mx-auto h-16 grid grid-cols-5 items-center justify-items-center">
              {(
                [
                  { id: "gym",     Icon: Dumbbell,     label: "Gym" },
                  { id: "library", Icon: BookOpen,      label: "Library" },
                  { id: "coach",   Icon: MessageSquare, label: "Coach" },
                  { id: "morning", Icon: Sun,           label: "Mañana" },
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
        </div>
      </RestTimerProvider>
    </ThemeProvider>
  );
}