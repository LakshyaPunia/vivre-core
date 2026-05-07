import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  const [patientCode, setPatientCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, {
      email,
      password,
      options: mode === "signup" ? { data: { role, patient_code: patientCode } } : undefined,
    } as any);
    if (error) return setError(error.message);
    navigate({ to: "/" });
  };

  return (
    <div>
      <h1>Vivre — {mode === "signin" ? "Sign in" : "Sign up"}</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === "signup" && (
          <>
            <select value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="family">Family Member</option>
              <option value="doctor">Doctor</option>
            </select>
            <input placeholder="Patient ID or invite code" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} />
          </>
        )}
        <button type="submit">{mode === "signin" ? "Sign in" : "Sign up"}</button>
      </form>
      {error && <p>{error}</p>}
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}