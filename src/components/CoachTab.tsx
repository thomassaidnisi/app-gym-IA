import React, { useState, useEffect, useRef } from "react";
import { UserProfile, FullTrainingPlan, NutritionGuide, ChatMessage, CoachResponse } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, Check, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { savePlan, loadWorkoutLogsMerged } from "../lib/db";

interface CoachTabProps {
  plan: FullTrainingPlan | null;
  profile: UserProfile | null;
  onPlanUpdated: (updatedPlan: FullTrainingPlan) => void;
  nutritionGuide: NutritionGuide | null;
  onNutritionUpdated: (updatedGuide: NutritionGuide) => void;
}

const T = {
  bg:      "var(--bg-primary)",
  bgSec:   "var(--bg-secondary)",
  textPri: "var(--text-primary)",
  textSec: "var(--text-secondary)",
  textTer: "var(--text-tertiary)",
  border:  "var(--border)",
};

export const CoachTab: React.FC<CoachTabProps> = ({ plan, profile, onPlanUpdated, nutritionGuide, onNutritionUpdated }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [applyState, setApplyState] = useState<{ [key: string]: "idle" | "loading" | "success" }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => {
    if (!plan || !profile) return;
    const cachedHistory = localStorage.getItem("healty_chat_history");
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory) as ChatMessage[];
        setMessages(parsed.slice(-20));
      } catch (e) {
        console.error("Error reading cached chat", e);
        initializeWelcome();
      }
    } else {
      initializeWelcome();
    }
  }, [plan?.plan_name, profile?.name]);

  const initializeWelcome = () => {
    if (!plan || !profile) return;
    const welcomeText = `¡Hola **${profile.name || "Atleta"}**! Soy tu **Coach IA** y fisiólogo personal. Conozco todos los detalles de tu plan activo (**${plan.plan_name}**).

¿Quieres hacer algún ajuste? Podés pedirme cualquier cambio en lenguaje natural. Por ejemplo:
- *"Reemplazá el Press de Banca de los lunes por flexiones o mancuernas."*
- *"Aumentá el volumen de hombros de mi rutina."*
- *"Cambiá el calentamiento por algo más guiado y corto."*
- *"Sustituye cualquier ejercicio con poleas porque entreno en casa."*

¡Dime qué quieres mejorar hoy y yo me encargo de actualizar tu plan al instante!`;

    const welcomeMsg: ChatMessage = { id: "welcome", role: "coach", text: welcomeText, timestamp: Date.now() };
    setMessages([welcomeMsg]);
    localStorage.setItem("healty_chat_history", JSON.stringify([welcomeMsg]));
  };

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatMessageContent = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, lineIdx) => {
      const isBullet = line.trim().startsWith("-") || line.trim().startsWith("*");
      const content = isBullet ? line.replace(/^[-*]\s*/, "") : line;
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-bold" style={{ color: T.textPri }}>{part.slice(2, -2)}</strong>
          : part
      );
      if (isBullet) return <li key={lineIdx} className="ml-4 list-disc mb-1.5" style={{ color: T.textPri }}>{rendered}</li>;
      return line.trim() === ""
        ? <div key={lineIdx} className="h-2" />
        : <p key={lineIdx} className="mb-2 last:mb-0">{rendered}</p>;
    });
  };

  const buildRecentWorkoutSummary = async (): Promise<{
    date: string;
    dayName: string;
    durationMinutes: number;
    totalVolumeKg: number;
  }[]> => {
    try {
      const logs = await loadWorkoutLogsMerged(user?.id ?? null);
      return logs
        .slice(0, 8)
        .map(({ date, dayName, durationMinutes, totalVolumeKg }) => ({
          date,
          dayName,
          durationMinutes,
          totalVolumeKg,
        }));
    } catch {
      return [];
    }
  };

  const buildExerciseHistory = (): Record<string, { date: string; weight: string }[]> => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14); // últimas 2 semanas
    const history: Record<string, { date: string; weight: string }[]> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('log_')) continue;
      const parts = key.split('_');
      if (parts.length < 3) continue;
      const date = parts[1];
      if (new Date(date) < cutoff) continue;
      const exerciseName = parts.slice(2).join('_');
      const weight = localStorage.getItem(key) || '';
      if (!history[exerciseName]) history[exerciseName] = [];
      history[exerciseName].push({ date, weight });
    }
    Object.keys(history).forEach(name => {
      history[name] = history[name]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3);
    });
    return history;
  };

    const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || !plan || !profile) return;
    const userQuery = inputText.trim();
    setInputText("");
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: userQuery, timestamp: Date.now() };
    const updatedMessages = [...messages, userMessage].slice(-20);
    setMessages(updatedMessages);
    localStorage.setItem("healty_chat_history", JSON.stringify(updatedMessages));
    setIsLoading(true);
    try {
      const res = await fetch("/api/coach-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userQuery, plan, profile, nutritionGuide, chatHistory: updatedMessages.slice(-6).map(m => ({ role: m.role, text: m.text })), exerciseHistory: buildExerciseHistory(), recentWorkoutLogs: await buildRecentWorkoutSummary() }),
      });
      if (!res.ok) throw new Error("Respuesta no válida del servidor.");
      const data: CoachResponse = await res.json();
      const coachMessage: ChatMessage = {
        id: `coach-${Date.now()}`, role: "coach", text: data.coach_message, timestamp: Date.now(),
        planPatch: data.plan_modified && data.updated_plan ? data.updated_plan : undefined, applied: false,
        nutritionPatch: data.nutrition_modified && data.updated_nutrition_guide ? data.updated_nutrition_guide : undefined, nutritionApplied: false,
      };
      const finalMessages = [...updatedMessages, coachMessage].slice(-20);
      setMessages(finalMessages);
      localStorage.setItem("healty_chat_history", JSON.stringify(finalMessages));
    } catch (error) {
      const errorMsg: ChatMessage = { id: `error-${Date.now()}`, role: "coach", text: "¡Ups! Tuve un problema para conectarme. ¿Podrías intentar nuevamente?", timestamp: Date.now() };
      const finalErrMessages = [...updatedMessages, errorMsg].slice(-20);
      setMessages(finalErrMessages);
      localStorage.setItem("healty_chat_history", JSON.stringify(finalErrMessages));
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleApplyPlanPatch = async (messageId: string, planPatch: FullTrainingPlan) => {
    if (applyState[messageId] === "success" || applyState[messageId] === "loading") return;
    setApplyState((prev) => ({ ...prev, [messageId]: "loading" }));
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      onPlanUpdated(planPatch);
      if (user) savePlan(user.id, planPatch).catch(console.error);
      const modified = messages.map((msg) => msg.id === messageId ? { ...msg, applied: true } : msg);
      setMessages(modified);
      localStorage.setItem("healty_chat_history", JSON.stringify(modified));
      setApplyState((prev) => ({ ...prev, [messageId]: "success" }));
    } catch (e) {
      console.error(e);
      setApplyState((prev) => ({ ...prev, [messageId]: "idle" }));
    }
  };

  const handleApplyNutritionPatch = async (messageId: string, nutritionPatch: NutritionGuide) => {
    if (applyState[`nutrition-${messageId}`] === "success" || applyState[`nutrition-${messageId}`] === "loading") return;
    setApplyState((prev) => ({ ...prev, [`nutrition-${messageId}`]: "loading" }));
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      onNutritionUpdated(nutritionPatch);
      const modified = messages.map((msg) => msg.id === messageId ? { ...msg, nutritionApplied: true } : msg);
      setMessages(modified);
      localStorage.setItem("healty_chat_history", JSON.stringify(modified));
      setApplyState((prev) => ({ ...prev, [`nutrition-${messageId}`]: "success" }));
    } catch (e) {
      console.error(e);
      setApplyState((prev) => ({ ...prev, [`nutrition-${messageId}`]: "idle" }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
          <Sparkles className="w-8 h-8 text-brand animate-pulse-slow" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ color: T.textPri }}>Coach IA No Disponible</h2>
        <p className="max-w-sm mb-6 text-sm" style={{ color: T.textSec }}>Primero debés generar tu plan personalizado de entrenamiento.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ backgroundColor: T.bgSec, color: T.textPri }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md safe-pt p-4 pl-6 pr-6" style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-none" style={{ color: T.textPri }}>Coach IA</h1>
            <p className="text-xs tracking-wide mt-1" style={{ color: T.textSec }}>Pedile cambios a tu plan en vivo</p>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold"
            style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Plan Activo
          </motion.div>
        </div>
        <div className="mt-3 rounded-xl p-2 flex items-center justify-between text-xs px-3" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span style={{ color: T.textPri }}>●</span>
            <span className="font-medium truncate" style={{ color: T.textPri }}>{plan.plan_name}</span>
          </div>
          <span className="text-[10px] rounded-md px-1.5 py-0.5 shrink-0 uppercase" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, color: T.textSec }}>
            {plan.division}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isCoach = msg.role === "coach";
            const isApplied = msg.applied;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex flex-col ${isCoach ? "items-start" : "items-end"} w-full`}
              >
                <div
                  className={`relative p-3.5 px-4 max-w-[85%] text-[13.5px] leading-relaxed ${
                    isCoach ? "rounded-[20px] rounded-tl-sm select-text" : "bg-brand text-black font-semibold rounded-[20px] rounded-tr-sm select-text"
                  }`}
                  style={isCoach ? { backgroundColor: T.bg, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", color: T.textPri } : {}}
                >
                  {isCoach ? (
                    <div className="space-y-1 font-normal">{formatMessageContent(msg.text)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                  <span className={`block text-[9px] mt-1.5 uppercase tracking-wider ${isCoach ? "text-left" : "text-right font-medium"}`}
                    style={{ color: isCoach ? T.textTer : "rgba(0,0,0,0.4)" }}>
                    {isCoach ? "Coach" : "Atleta"} · {formatTime(msg.timestamp)}
                  </span>
                </div>

                {isCoach && msg.planPatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="mt-2 w-[85%] rounded-2xl p-3.5 space-y-3"
                    style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold" style={{ color: T.textPri }}>Modificación de Plan Lista</h4>
                        <p className="text-[11px]" style={{ color: T.textSec }}>Aplicá estos cambios para reemplazar tu rutina activa.</p>
                      </div>
                    </div>
                    {isApplied ? (
                      <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
                        <Check className="w-4 h-4" style={{ color: T.textPri }} />
                        Cambios aplicados
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleApplyPlanPatch(msg.id, msg.planPatch!)}
                        disabled={applyState[msg.id] === "loading"}
                        className="w-full bg-brand text-black hover:bg-lime-400 py-2.5 rounded-xl text-xs font-semibold uppercase shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {applyState[msg.id] === "loading"
                          ? <><Loader2 className="w-4 h-4 animate-spin text-black" />Aplicando...</>
                          : <><Check className="w-4 h-4 text-black" />Aplicar Cambios al Plan</>}
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {isCoach && msg.nutritionPatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="mt-2 w-[85%] rounded-2xl p-3.5 space-y-3"
                    style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold" style={{ color: T.textPri }}>Cambio en tu guía nutricional</h4>
                        <p className="text-[11px]" style={{ color: T.textSec }}>Aplicá estos cambios para reemplazar tu guía activa.</p>
                      </div>
                    </div>
                    {msg.nutritionApplied ? (
                      <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textSec }}>
                        <Check className="w-4 h-4" style={{ color: T.textPri }} />
                        Cambios aplicados
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleApplyNutritionPatch(msg.id, msg.nutritionPatch!)}
                        disabled={applyState[`nutrition-${msg.id}`] === "loading"}
                        className="w-full bg-brand text-black hover:bg-lime-400 py-2.5 rounded-xl text-xs font-semibold uppercase shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {applyState[`nutrition-${msg.id}`] === "loading"
                          ? <><Loader2 className="w-4 h-4 animate-spin text-black" />Aplicando...</>
                          : <><Check className="w-4 h-4 text-black" />Aplicar cambios</>}
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start w-full">
            <div className="p-3.5 rounded-[20px] rounded-tl-sm shadow-sm" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-1.5 py-1 px-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: T.textTer, animationDelay: `${delay}ms` }} />
                ))}
              </div>
              <span className="block text-[8px] uppercase tracking-wider mt-2" style={{ color: T.textTer }}>Analizando tu plan...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input */}
      <div className="fixed bottom-16 left-0 right-0 z-20 pt-4 pb-[calc(12px+env(safe-area-inset-bottom))] px-4" style={{ background: `linear-gradient(to top, ${T.bgSec} 80%, transparent)`, borderTop: `1px solid ${T.border}33` }}>
        <form
          onSubmit={handleSendMessage}
          className="max-w-2xl mx-auto flex items-end gap-2 rounded-2xl p-2 shadow-md"
          style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Sube a 4 series de pecho los lunes..."
            className="flex-1 bg-transparent border-0 outline-none p-2 text-sm resize-none max-h-24 min-h-[40px] leading-relaxed select-text"
            style={{ color: T.textPri }}
            disabled={isLoading}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl font-semibold transition-all flex items-center justify-center shrink-0 shadow-sm disabled:cursor-not-allowed bg-brand text-black hover:bg-lime-400 disabled:bg-transparent disabled:shadow-none"
            style={(!inputText.trim() || isLoading) ? { backgroundColor: T.bgSec, border: `1px solid ${T.border}`, color: T.textTer } : {}}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </form>
        <p className="text-[9px] text-center mt-2 uppercase tracking-wider" style={{ color: T.textTer }}>
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>
  );
};
