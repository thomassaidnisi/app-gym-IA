import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata?: { nombre: string; apellido: string; fecha_nacimiento: string }) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, session?.user?.id ?? "null");
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { nombre: string; apellido: string; fecha_nacimiento: string }
  ): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return error;
  };

  const signIn = async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
