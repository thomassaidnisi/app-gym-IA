import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail } from "lucide-react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup" | "forgot" | "verify";

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
  const [verifyEmail, setVerifyEmail] = useState("");

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
        setVerifyEmail(email);
        setEmail(""); setPassword("");
        setNombre(""); setApellido(""); setFechaNacimiento("");
        setMode("verify");
      }
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: verifyEmail });
    if (err) setError(err.message);
    else setInfo("Email reenviado. Revisá tu bandeja.");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image */}
      <img
        src="/auth-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ zIndex: 0, userSelect: "none", pointerEvents: "none" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 10 }} />

      {/* Content */}
      <div
        className="relative min-h-screen flex items-center justify-center md:justify-end px-5 md:pr-16"
        style={{
          zIndex: 20,
          paddingTop: "env(safe-area-inset-top, 24px)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        <AnimatePresence mode="wait">

          {/* ── Verify email card ── */}
          {mode === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm rounded-3xl px-7 py-10 flex flex-col items-center text-center gap-5"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(200,241,53,0.12)", border: "1px solid rgba(200,241,53,0.25)" }}
              >
                <Mail size={48} style={{ color: "#c8f135" }} />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-white">Confirmá tu mail</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Te enviamos un link de confirmación a
                </p>
                <p className="text-sm font-bold text-white break-all">{verifyEmail}</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-sm" style={{ color: "#f87171" }}
                  >{error}</motion.p>
                )}
                {info && (
                  <motion.p
                    key="inf"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-sm" style={{ color: "#c8f135" }}
                  >{info}</motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                onClick={handleResend}
                disabled={loading}
                className="w-full h-12 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-opacity"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
              >
                {loading ? "…" : "Reenviar email"}
              </motion.button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-sm transition-opacity active:opacity-60"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Volver al inicio de sesión
              </button>
            </motion.div>
          )}

          {/* ── Login / Signup / Forgot card ── */}
          {mode !== "verify" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {mode === "login" ? "Bienvenido de nuevo." : mode === "signup" ? "Creá tu cuenta para empezar." : "Ingresá tu email para recuperar tu contraseña."}
                </p>
              </div>

              {/* Mode toggle — only login/signup */}
              {(mode === "login" || mode === "signup") && (
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

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <h2 className="text-xl font-bold tracking-tight text-white mb-5">
                    {mode === "login" ? "Iniciá sesión" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña"}
                  </h2>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
