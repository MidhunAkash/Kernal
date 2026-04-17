import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { listApiKeys } from "./humexApi";

const AuthContext = createContext(null);
const DEFAULT_KEY_NAME = "default_key";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const ensuredUsersRef = useRef(new Set());
  const inFlightRef = useRef(new Map());

  // Helper function to create user profile if it doesn't exist
  const ensureUserProfile = useCallback(async (authUser) => {
    if (!authUser) return;
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id,email,name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking user profile:", fetchError);
      return;
    }

    if (!existingUser) {
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
      return;
    }

    const nextName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || null;
    const shouldUpdateEmail = authUser.email && existingUser.email !== authUser.email;
    const shouldUpdateName = nextName && existingUser.name !== nextName;

    if (shouldUpdateEmail || shouldUpdateName) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email: shouldUpdateEmail ? authUser.email : existingUser.email,
          name: shouldUpdateName ? nextName : existingUser.name,
        })
        .eq("id", authUser.id);

      if (updateError) {
        console.error("Error updating user profile:", updateError);
      }
    }
  }, []);

  const ensureHumExAccess = useCallback(async (authUser) => {
    const uid = authUser?.id;
    if (!uid || ensuredUsersRef.current.has(uid)) return;

    const existingTask = inFlightRef.current.get(uid);
    if (existingTask) {
      await existingTask;
      return;
    }

    const task = (async () => {
      await ensureUserProfile(authUser);
      try {
        await listApiKeys(uid);
      } catch (error) {
        console.error(`Error ensuring ${DEFAULT_KEY_NAME} API key:`, error);
      }
      ensuredUsersRef.current.add(uid);
    })();

    inFlightRef.current.set(uid, task);
    try {
      await task;
    } finally {
      inFlightRef.current.delete(uid);
    }
  }, [ensureUserProfile]);

  useEffect(() => {
    let active = true;

    const syncSession = async (nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          await ensureHumExAccess(nextSession.user);
        } catch (err) {
          console.error("ensureHumExAccess failed:", err);
        }
      }

      if (active) {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) => syncSession(nextSession))
      .catch((error) => {
        console.error("Error restoring session:", error);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [ensureHumExAccess]);

  /* --- legacy methods (used by MCP pages) --- */
  const signUp = async (email, password, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (data?.user) {
      try {
        await ensureHumExAccess(data.user);
      } catch (err) {
        console.error(err);
      }
    }
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data?.session) {
      setSession(data.session);
      setUser(data.user ?? null);
    }
    if (data?.user) {
      try {
        await ensureHumExAccess(data.user);
      } catch (err) {
        console.error(err);
      }
    }
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
  const register = useCallback(async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (data.user) {
        try {
          await ensureHumExAccess({
            ...data.user,
            user_metadata: {
              ...data.user.user_metadata,
              name,
            },
          });
        } catch (err) {
          console.error(err);
        }
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [ensureHumExAccess]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        setSession(data.session);
        setUser(data.user ?? null);
      }
      if (data?.user) {
        try {
          await ensureHumExAccess(data.user);
        } catch (err) {
          console.error("ensureHumExAccess failed:", err);
        }
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
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
