import React, { createContext, useContext, useState, useEffect, useRef } from "react";

interface RestTimerContextType {
  isActive: boolean;
  timeLeft: number;
  duration: number;
  label: string;
  isOpen: boolean;
  startTimer: (seconds: number, exerciseName: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (seconds?: number) => void;
  closeTimer: () => void;
  setPreset: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export const useRestTimer = () => {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error("useRestTimer must be used within a RestTimerProvider");
  }
  return context;
};

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [duration, setDuration] = useState(60);
  const [label, setLabel] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsActive(false);
            playCompletionSound();
            triggerSuccessToast();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const triggerSuccessToast = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const playCompletionSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const frequencies = [880, 660, 880];
      const durationEach = 0.15;
      
      frequencies.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + idx * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.2 + durationEach);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.2);
        osc.stop(audioCtx.currentTime + idx * 0.2 + durationEach);
      });
    } catch (e) {
      console.error("AudioContext beep failed:", e);
    }
  };

  const startTimer = (seconds: number, exerciseName: string) => {
    setDuration(seconds);
    setTimeLeft(seconds);
    setLabel(exerciseName);
    setIsActive(true);
    setIsOpen(true);
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resumeTimer = () => {
    setIsActive(true);
  };

  const resetTimer = (seconds?: number) => {
    const sec = seconds ?? duration;
    setTimeLeft(sec);
    setIsActive(false);
  };

  const closeTimer = () => {
    setIsOpen(false);
  };

  const setPreset = (seconds: number) => {
    setDuration(seconds);
    setTimeLeft(seconds);
  };

  return (
    <RestTimerContext.Provider
      value={{
        isActive,
        timeLeft,
        duration,
        label,
        isOpen,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        closeTimer,
        setPreset,
      }}
    >
      {children}
      {/* Toast Alert */}
      {showToast && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 font-semibold text-sm px-6 py-3 rounded-full flex items-center shadow-lg transition-all"
          style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <svg className="w-5 h-5 mr-2 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Descanso completado — ¡A entrenar!
        </div>
      )}
    </RestTimerContext.Provider>
  );
};
