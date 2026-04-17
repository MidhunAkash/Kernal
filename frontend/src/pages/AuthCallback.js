import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    let active = true;

    const completeAuth = async () => {
      if (loading) return;

      if (user) {
        navigate("/expert", { replace: true });
        return;
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (session?.user) {
          navigate("/expert", { replace: true });
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }

      if (active) {
        navigate("/login", { replace: true });
      }
    };

    void completeAuth();

    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
