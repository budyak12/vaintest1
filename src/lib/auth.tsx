import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "./supabase-helpers";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  username: string | null;
  signIn: (username: string, password: string) => Promise<{ error?: string }>;
  signUp: (username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer secondary fetches to avoid deadlocks
        setTimeout(() => {
          void loadUserContext(sess.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setUsername(null);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadUserContext(data.session.user.id);
      }
      setIsLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadUserContext(userId: string) {
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setUsername(profile?.username ?? null);
  }

  async function signIn(username: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    return error ? { error: error.message } : {};
  }

  async function signUp(username: string, password: string) {
    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername === "vainadminka") {
      // Reserve admin login. Admin must be the first to sign up; if they
      // already exist (sign-in), supabase returns "User already registered".
    }
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(cleanUsername),
      password,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAdmin, username, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
