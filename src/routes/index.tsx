import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, BellRing, Plus, Sun } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PatientCard } from "@/components/vivre/PatientCard";
import { Skeleton } from "@/components/vivre/Skeleton";
import { Chatbot } from "@/components/vivre/Chatbot";
import { DEMO_PATIENTS, DEMO_VITALS, DEMO_ALERTS } from "@/lib/demo-data";

const VITAL_KEYS = ["heart_rate", "spo2", "blood_pressure"] as const;

function statusFor(metric: string, value: number): "ok" | "warn" | "crit" {
  if (metric === "heart_rate") return value < 50 || value > 110 ? "crit" : value < 60 || value > 100 ? "warn" : "ok";
  if (metric === "spo2") return value < 90 ? "crit" : value < 94 ? "warn" : "ok";
  if (metric === "blood_pressure") return value > 150 ? "crit" : value > 130 ? "warn" : "ok";
  return "ok";
}

async function loadPatients() {
  // Try real Supabase first
  const { data: patients, error } = await supabase.from("patients").select("*");
  if (error || !patients || patients.length === 0) {
    return DEMO_PATIENTS.map((p) => decoratePatient(p, DEMO_VITALS[p.id] ?? [], DEMO_ALERTS[p.id] ?? []));
  }
  const ids = patients.map((p: any) => p.id);
  const [{ data: vitals }, { data: alerts }] = await Promise.all([
    supabase.from("vitals_readings").select("*").in("patient_id", ids).order("timestamp", { ascending: false }),
    supabase.from("alerts").select("*").in("patient_id", ids).eq("acknowledged", false),
  ]);
  return patients.map((p: any) => {
    const pv = (vitals ?? []).filter((v: any) => v.patient_id === p.id);
    const pa = (alerts ?? []).filter((a: any) => a.patient_id === p.id);
    return decoratePatient(p, pv, pa);
  });
}

function decoratePatient(p: any, vitals: any[], alerts: any[]) {
  const vmap: Record<string, any> = {};
  for (const k of VITAL_KEYS) {
    const latest = vitals.find((v: any) => v.metric === k) ?? vitals.find((v: any) => v[k] != null);
    if (latest) {
      const value = latest.value ?? latest[k];
      vmap[k] = { value, status: latest.status ?? statusFor(k, value) };
    }
  }
  return { ...p, vitals: vmap, has_unack_alert: alerts.length > 0 };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivre — Dashboard" },
      { name: "description", content: "Live overview of everyone you care about." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: patients = [], isLoading, refetch } = useQuery({
    queryKey: ["patients"],
    queryFn: loadPatients,
  });

  useEffect(() => {
    const channel = supabase
      .channel("vitals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "vitals_readings" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const criticalCount = patients.filter((p: any) => (p.health_score ?? 100) < 40).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
            <Sun className="h-3.5 w-3.5 text-cyan-400" /> Good morning
          </div>
          <h1 className="font-display text-3xl font-light text-text-primary md:text-4xl">
            <span className="font-semibold">Sarah</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {patients.length} loved {patients.length === 1 ? "one" : "ones"} · monitoring live
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl glass"
            aria-label="Notifications"
          >
            <BellRing className="h-4 w-4 text-text-secondary" />
            {criticalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-crit px-1 text-[9px] font-bold text-white">
                {criticalCount}
              </span>
            )}
          </motion.button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 font-semibold text-white">
            S
          </div>
        </div>
      </header>

      <AnimatePresence>
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-6 flex items-center gap-3 rounded-2xl glass glass-crit p-4"
          >
            <AlertOctagon className="h-5 w-5 text-status-crit" />
            <p className="flex-1 text-sm text-text-primary">
              <span className="font-semibold">{criticalCount}</span> patient
              {criticalCount > 1 ? "s require" : " requires"} immediate attention.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))
          : patients.map((p: any) => <PatientCard key={p.id} patient={p} />)}
      </motion.div>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.6 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-44 left-4 z-40 flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-3 text-sm font-medium text-[#06121a] shadow-[0_8px_24px_rgba(6,182,212,0.45)] md:bottom-6"
      >
        <Plus className="h-4 w-4" /> Add patient
      </motion.button>

      <Chatbot />
    </div>
  );
}
