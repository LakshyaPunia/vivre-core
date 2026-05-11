import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PatientCard } from "@/components/vivre/PatientCard";
import { Skeleton } from "@/components/vivre/Skeleton";
import { Chatbot } from "@/components/vivre/Chatbot";
import { DEMO_PATIENTS, DEMO_VITALS, DEMO_ALERTS } from "@/lib/demo-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const latest = vitals[0];
  if (latest) {
    vmap["heart_rate"] = {
      value: Math.round(latest.heart_rate ?? 0),
      status: statusFor("heart_rate", latest.heart_rate ?? 0),
    };
    vmap["spo2"] = {
      value: Math.round(latest.spo2 ?? 0),
      status: statusFor("spo2", latest.spo2 ?? 0),
    };
    if (latest.systolic_bp != null && latest.diastolic_bp != null) {
      vmap["blood_pressure"] = {
        value: `${Math.round(latest.systolic_bp)}/${Math.round(latest.diastolic_bp)}`,
        status: statusFor("blood_pressure", latest.systolic_bp),
      };
    }
  }
  return {
    ...p,
    health_score: latest?.health_score ?? p.health_score ?? 0,
    predicted_condition: latest?.predicted_disease ?? p.predicted_condition ?? "",
    updated_at: latest?.timestamp ?? p.updated_at,
    vitals: vmap,
    hr_history: vitals.filter((v: any) => v.heart_rate != null).map((v: any) => Math.round(v.heart_rate)).slice(0, 20).reverse(),
    has_unack_alert: alerts.length > 0,
  };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivre: Live Care Monitor" },
      { name: "description", content: "Live overview of everyone you care about." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: initialPatients = [], isLoading, refetch } = useQuery({
    queryKey: ["patients"],
    queryFn: loadPatients,
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    age: "",
    gender: "",
    city: "",
    predicted_condition: "",
  });

  useEffect(() => {
    if (initialPatients && initialPatients.length) setPatients(initialPatients);
  }, [initialPatients]);

  const computeStatus = (metric: string, value: number): "ok" | "warn" | "crit" => {
    if (metric === "heart_rate") {
      if (value < 50 || value > 120) return "crit";
      if (value > 100) return "warn";
      return "ok";
    }
    if (metric === "spo2") {
      if (value < 90) return "crit";
      if (value < 94) return "warn";
      return "ok";
    }
    if (metric === "blood_pressure") {
      if (value > 180) return "crit";
      if (value > 160) return "warn";
      return "ok";
    }
    return "ok";
  };

  useEffect(() => {
    const channel = supabase
      .channel("vitals-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_readings" },
        (payload: any) => {
          const row = payload?.new ?? {};
          const pid = row.patient_id;
          if (pid && (row.is_anomaly || (row.alerts_triggered ?? 0) > 0)) {
            setFlashIds((prev) => new Set(prev).add(pid));
            setTimeout(() => {
              setFlashIds((prev) => {
                const next = new Set(prev);
                next.delete(pid);
                return next;
              });
            }, 900);
          }
          if (!pid) return;
          setPatients((prev) =>
            prev.map((p) => {
              if (p.id !== pid) return p;
              const nextVitals = { ...(p.vitals ?? {}) };
              const updateVital = (key: "heart_rate" | "spo2" | "blood_pressure", val: any) => {
                if (val == null) return;
                const num = Number(val);
                if (!Number.isFinite(num)) return;
                nextVitals[key] = { value: val, status: computeStatus(key, num) };
              };
              if (row.metric && row.value != null) {
                updateVital(row.metric, row.value);
              } else {
                updateVital("heart_rate", row.heart_rate);
                updateVital("spo2", row.spo2);
                if (row.systolic_bp != null && row.diastolic_bp != null) {
                  nextVitals["blood_pressure"] = {
                    value: `${Math.round(row.systolic_bp)}/${Math.round(row.diastolic_bp)}`,
                    status: computeStatus("blood_pressure", row.systolic_bp),
                  };
                }
              }
              let hr_history = p.hr_history ?? [];
              const hrVal = row.metric === "heart_rate" ? Number(row.value) : Number(row.heart_rate);
              if (Number.isFinite(hrVal)) {
                hr_history = [...hr_history, hrVal].slice(-20);
              }
              return {
                ...p,
                health_score: row.health_score ?? p.health_score,
                predicted_condition: row.predicted_disease ?? p.predicted_condition,
                updated_at: row.timestamp ?? row.updated_at ?? new Date().toISOString(),
                vitals: nextVitals,
                hr_history,
              };
            })
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const criticalCount = patients.filter((p: any) => (p.health_score ?? 100) < 40).length;

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const ageNum = Number(addForm.age);
    if (!addForm.name.trim() || !addForm.age.trim() || !addForm.gender.trim() || !addForm.city.trim()) {
      setAddError("Please fill in full name, age, gender, and city.");
      return;
    }
    if (!Number.isFinite(ageNum) || ageNum <= 0) {
      setAddError("Age must be a positive number.");
      return;
    }
    setAddSaving(true);
    const { error } = await supabase.from("patients").insert({
      id: crypto.randomUUID(),
      name: addForm.name.trim(),
      age: ageNum,
      gender: addForm.gender.trim(),
      city: addForm.city.trim(),
      predicted_condition: addForm.predicted_condition.trim() || null,
    });
    setAddSaving(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    toast.success("Patient added");
    setAddOpen(false);
    setAddForm({ name: "", age: "", gender: "", city: "", predicted_condition: "" });
    refetch();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-10" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-[11px] font-medium uppercase"
            style={{ letterSpacing: "0.2em", color: "#06B6D4" }}
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Sun className="h-3.5 w-3.5" />
            </motion.span>
            Good morning
          </div>
          <h1 className="font-display mt-2 text-text-primary" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Lakshya
          </h1>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-text-secondary">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            </span>
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
            L
          </div>
        </div>
      </header>

      <AnimatePresence>
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5 inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}
          >
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </span>
            <span className="text-[12px] font-medium text-red-200">
              {criticalCount} patient{criticalCount > 1 ? "s require" : " requires"} immediate attention
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3"
        style={{ marginTop: 32 }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))
          : patients.map((p: any) => (
              <PatientCard key={p.id} patient={p} flash={flashIds.has(p.id)} />
            ))}
      </motion.div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-44 left-4 z-[70] flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-3 text-sm font-medium text-[#06121a] shadow-[0_8px_24px_rgba(6,182,212,0.45)] transition hover:scale-105 hover:bg-cyan-400 md:bottom-6 md:left-auto md:right-24"
      >
        <Plus className="h-4 w-4" /> Add patient
      </button>

      {addOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220] p-6 text-text-primary shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4 text-text-secondary transition hover:text-text-primary"
              aria-label="Close add patient form"
            >
              ×
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Add patient</h2>
              <p className="mt-2 text-sm text-text-secondary">Enter the patient details to add them to live monitoring.</p>
            </div>
          <form onSubmit={addPatient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="patient-name">Full name</Label>
                <Input
                  id="patient-name"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="border-white/10 bg-white/[0.03] text-text-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient-age">Age</Label>
                <Input
                  id="patient-age"
                  type="number"
                  min="1"
                  value={addForm.age}
                  onChange={(e) => setAddForm((f) => ({ ...f, age: e.target.value }))}
                  className="border-white/10 bg-white/[0.03] text-text-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient-gender">Gender</Label>
                <Input
                  id="patient-gender"
                  value={addForm.gender}
                  onChange={(e) => setAddForm((f) => ({ ...f, gender: e.target.value }))}
                  className="border-white/10 bg-white/[0.03] text-text-primary"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="patient-city">City</Label>
                <Input
                  id="patient-city"
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                  className="border-white/10 bg-white/[0.03] text-text-primary"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="patient-condition">Medical condition</Label>
                <Input
                  id="patient-condition"
                  value={addForm.predicted_condition}
                  onChange={(e) => setAddForm((f) => ({ ...f, predicted_condition: e.target.value }))}
                  className="border-white/10 bg-white/[0.03] text-text-primary"
                />
              </div>
            </div>
            {addError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {addError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSaving}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-[#06121a] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addSaving ? "Adding..." : "Add patient"}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      <Chatbot />
    </div>
  );
}
