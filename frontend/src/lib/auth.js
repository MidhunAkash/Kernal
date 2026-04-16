import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserProfile(session.user);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper function to create user profile if it doesn't exist
  const ensureUserProfile = async (authUser) => {
    if (!authUser) return;
    const { error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      const { error: insertError } = await supabase
        .from("users")
        .insert([
          {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
          },
        ]);
      if (insertError) console.error("Error creating user profile:", insertError);
    }
  };

  /* --- legacy methods (used by MCP pages) --- */
  const signUp = async (email, password, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (profileData) => {
    const { data, error } = await supabase.auth.updateUser({ data: profileData });
    if (!error) setUser((prev) => prev ? { ...prev, user_metadata: { ...prev.user_metadata, ...profileData } } : prev);
    return { data, error };
  };

  /* --- new methods from main branch (used by Landing/Login/Register) --- */
  const register = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (data.user) {
        const { error: insertError } = await supabase
          .from("users")
          .insert([{ id: data.user.id, email: data.user.email, name }]);
        if (insertError) console.error("Error creating user profile:", insertError);
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const role = user?.user_metadata?.role ?? null;
  const isExpert = role === "expert";
  const isTarget = role === "target";

  return (
    <AuthContext.Provider
      value={{
        user, session, loading,
        signUp, signIn, signOut, updateProfile,
        register, login, loginWithGoogle, logout,
        role, isExpert, isTarget,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
