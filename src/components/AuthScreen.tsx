import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup" | "forgot";

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-base placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors";

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) {
        setError(err.message);
      } else {
        setInfo("Te enviamos un link de recuperación. Revisá tu email.");
        setEmail("");
      }
    } else if (mode === "login") {
      const err = await signIn(email, password);
      if (err) setError(err.message);
    } else {
      const err = await signUp(email, password, {
        nombre,
        apellido,
        fecha_nacimiento: fechaNacimiento,
      });
      if (err) {
        setError(err.message);
      } else {
        setInfo("¡Listo! Revisá tu email para confirmar la cuenta.");
        setEmail(""); setPassword("");
        setNombre(""); setApellido(""); setFechaNacimiento("");
      }
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ── Background image ── */}
      <img
        src="/auth-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ zIndex: 0, userSelect: "none", pointerEvents: "none" }}
      />

      {/* ── Dark overlay ── */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 10 }} />

      {/* ── Content ── */}
      <div
        className="relative min-h-screen flex items-center justify-center md:justify-end px-5 md:pr-16"
        style={{
          zIndex: 20,
          paddingTop: "env(safe-area-inset-top, 24px)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm rounded-3xl px-7 py-8"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Wordmark */}
          <div className="mb-8">
            <p className="text-3xl font-black tracking-tight text-white">
              healty<span style={{ color: "#c8f135" }}>.</span>
            </p>
            <p className="text-white/40 text-sm mt-1">
              {mode === "login" ? "Bienvenido de nuevo." : "Creá tu cuenta para empezar."}
            </p>
          </div>

          {/* Mode toggle — hidden in forgot mode */}
          {mode !== "forgot" && (
            <div
              className="flex rounded-2xl p-1 mb-7"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="flex-1 h-10 rounded-xl text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  style={
                    mode === m
                      ? { backgroundColor: "#c8f135", color: "#000" }
                      : { color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {m === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>
          )}

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="text-xl font-bold tracking-tight text-white mb-5"
            >
              {mode === "login" ? "Iniciá sesión" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña"}
            </motion.h2>
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            {/* Signup-only fields */}
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Apellido"
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 px-1">
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      required
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      className={inputClass}
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {mode !== "forgot" && (
              <>
                <input
                  type="password"
                  placeholder="Contraseña"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-right transition-opacity active:opacity-60 outline-none"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </>
            )}

            {/* Feedback */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm px-1"
                  style={{ color: "#f87171" }}
                >
                  {error}
                </motion.p>
              )}
              {info && (
                <motion.p
                  key="info"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm px-1"
                  style={{ color: "#c8f135" }}
                >
                  {info}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl font-black text-base text-black mt-1 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "#c8f135", height: 52 }}
            >
              {loading ? "…" : mode === "login" ? "Ingresar" : mode === "signup" ? "Registrarme" : "Enviar link de recuperación"}
            </motion.button>
          </form>

          <button
            type="button"
            onClick={() => switchMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup")}
            className="w-full mt-5 text-sm text-center transition-opacity active:opacity-60 outline-none"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {mode === "login"
              ? "¿No tenés cuenta? Registrate"
              : mode === "signup"
              ? "¿Ya tenés cuenta? Iniciá sesión"
              : "Volver a iniciar sesión"}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
