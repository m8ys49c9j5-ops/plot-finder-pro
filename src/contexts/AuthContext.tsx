import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  credits: 0,
  loading: true,
  refreshCredits: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setCredits(data.credits);
  }, []);

  const refreshCredits = useCallback(async () => {
    if (user) await fetchCredits(user.id);
  }, [user, fetchCredits]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCredits(0);
  }, []);

  useEffect(() => {
    let initialised = false;

    // 1. Restore session from storage first (authoritative source)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.id);
      initialised = true;
      setLoading(false);
    });

    // 2. Listen for subsequent changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip INITIAL_SESSION — getSession handles it above
      if (!initialised) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchCredits(session.user.id), 0);
      } else {
        setCredits(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  return (
    <AuthContext.Provider value={{ user, session, credits, loading, refreshCredits, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
