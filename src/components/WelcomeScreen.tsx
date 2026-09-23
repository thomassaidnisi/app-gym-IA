import React from "react";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <img
        src="/welcome-bg.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ userSelect: "none", pointerEvents: "none" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col justify-end min-h-screen pb-12 px-6"
        style={{
          paddingTop: "env(safe-area-inset-top, 24px)",
          paddingBottom: "max(48px, env(safe-area-inset-bottom, 24px))",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm mx-auto rounded-3xl px-7 py-8"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-8">
            <p className="text-3xl font-black tracking-tight text-white">
              healty<span style={{ color: "#c8f135" }}>.</span>
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Tu entrenador y nutricionista con IA. Entrená, comé mejor, progresá.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onSignup}
              className="w-full rounded-2xl font-black text-base text-black transition-opacity"
              style={{ backgroundColor: "#c8f135", height: 52 }}
            >
              Crear cuenta
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onLogin}
              className="w-full rounded-2xl font-bold text-base text-white transition-opacity"
              style={{ height: 52, border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Iniciar sesión
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
