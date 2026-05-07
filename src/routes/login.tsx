import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Vivre" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"family" | "doctor">("family");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, {
      email, password,
      options: mode === "signup" ? { data: { role, patient_code: code } } : undefined,
    } as any);
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/" });
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl glass glass-cyan p-7"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-500" />
          </span>
          <span className="font-display text-2xl font-semibold">Vivre</span>
        </div>
        <h1 className="font-display text-2xl font-light">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {mode === "signin" ? "Sign in to check on your loved ones." : "Live fully, stay connected."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email" required placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="password" required placeholder="Password" minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {mode === "signup" && (
            <>
              <div className="flex gap-2">
                {(["family", "doctor"] as const).map((r) => (
                  <button
                    key={r} type="button" onClick={() => setRole(r)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium capitalize transition ${
                      role === r ? "bg-cyan-500 text-[#06121a]" : "bg-white/5 text-text-secondary"
                    }`}
                  >
                    {r === "family" ? "Family member" : "Doctor"}
                  </button>
                ))}
              </div>
              <input
                placeholder="Patient ID or invite code"
                value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </>
          )}
          {error && <p className="text-xs text-status-crit">{error}</p>}
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-[#06121a] shadow-[0_8px_24px_rgba(6,182,212,0.4)] disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </motion.button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-text-secondary hover:text-text-primary"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted">
          <Heart className="h-3 w-3 text-status-crit" /> Live fully, stay connected
        </div>
      </motion.div>
    </div>
  );
}
