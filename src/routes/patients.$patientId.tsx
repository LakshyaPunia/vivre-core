import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Heart, Wind, Gauge, Thermometer, Droplet, Activity, AlertTriangle,
  ArrowLeft, Phone, Shield, Video, Clock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { HealthScoreRing } from "@/components/vivre/HealthScoreRing";
import { VitalCard } from "@/components/vivre/VitalCard";
import { Chatbot } from "@/components/vivre/Chatbot";
import { Skeleton } from "@/components/vivre/Skeleton";
import { PatientAlertFeed } from "@/components/vivre/PatientAlertFeed";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function BellIconForSeverity(sev?: string) {
  if (sev === "critical") return AlertTriangle;
  return Activity;
}

export const Route = createFileRoute("/patients/$patientId")({
  head: () => ({ meta: [{ title: "Patient — Vivre" }] }),
  component: PatientDetail,
});

const ICON_MAP: Record<string, any> = {
  heart_rate: Heart, spo2: Wind, blood_pressure: Gauge,
  temperature: Thermometer, glucose: Droplet, respiratory_rate: Activity,
};
const LABEL_MAP: Record<string, string> = {
  heart_rate: "Heart Rate", spo2: "SpO₂", blood_pressure: "Blood Pressure",
  temperature: "Temperature", glucose: "Glucose", respiratory_rate: "Respiratory",
};
const UNIT_MAP: Record<string, string> = {
  heart_rate: "bpm", spo2: "%", blood_pressure: "mmHg",
  temperature: "°C", glucose: "mg/dL", respiratory_rate: "/min",
};
const ANIM_MAP: Record<string, "heartbeat" | "breathe" | "none"> = {
  heart_rate: "heartbeat", spo2: "breathe", blood_pressure: "none",
  temperature: "none", glucose: "none", respiratory_rate: "none",
};

type Status = "ok" | "warn" | "crit";
function statusFor(metric: string, value: number): Status {
  if (value == null || isNaN(value)) return "ok";
  switch (metric) {
    case "heart_rate":
      if (value < 50 || value > 120) return "crit";
      if (value > 100) return "warn";
      return "ok";
    case "spo2":
      if (value < 90) return "crit";
      if (value < 94) return "warn";
      return "ok";
    case "blood_pressure":
      if (value > 180) return "crit";
      if (value > 160) return "warn";
      return "ok";
    case "temperature":
      if (value >= 39 || value < 35) return "crit";
      if (value >= 38) return "warn";
      return "ok";
    case "glucose":
      if (value > 250 || value < 60) return "crit";
      if (value > 180) return "warn";
      return "ok";
    case "respiratory_rate":
      if (value < 10 || value > 28) return "crit";
      if (value < 12 || value > 24) return "warn";
      return "ok";
  }
  return "ok";
}

function adherenceToScore(s?: string | null): number {
  switch ((s ?? "").toLowerCase()) {
    case "excellent": return 100;
    case "good": return 75;
    case "moderate": return 50;
    case "low": return 25;
    default: return 0;
  }
}

function buildVitals(row: any) {
  if (!row) return [];
  const out: any[] = [];
  if (row.heart_rate != null) {
    const v = Number(row.heart_rate);
    out.push({ metric: "heart_rate", value: Math.round(v), status: statusFor("heart_rate", v) });
  }
  if (row.spo2 != null) {
    const v = Number(row.spo2);
    out.push({ metric: "spo2", value: Math.round(v), status: statusFor("spo2", v) });
  }
  if (row.systolic_bp != null && row.diastolic_bp != null) {
    const sys = Number(row.systolic_bp), dia = Number(row.diastolic_bp);
    out.push({
      metric: "blood_pressure",
      value: Math.round(sys),
      displayValue: `${Math.round(sys)}/${Math.round(dia)}`,
      status: statusFor("blood_pressure", sys),
    });
  }
  if (row.body_temp != null) {
    const v = Number(row.body_temp);
    out.push({ metric: "temperature", value: v, status: statusFor("temperature", v), decimals: 1 });
  }
  if (row.glucose_level != null) {
    const v = Number(row.glucose_level);
    out.push({ metric: "glucose", value: Math.round(v), status: statusFor("glucose", v) });
  }
  if (row.respiratory_rate != null) {
    const v = Number(row.respiratory_rate);
    out.push({ metric: "respiratory_rate", value: Math.round(v), status: statusFor("respiratory_rate", v) });
  }
  return out;
}

function buildLifestyle(row: any) {
  if (!row) return [];
  return [
    { label: "Sleep quality", value: Math.round((Number(row.sleep_quality) || 0) * 10) },
    { label: "Stress level", value: Math.round((Number(row.stress_level) || 0) * 10), invert: true },
    { label: "Activity score", value: Math.round(Number(row.activity_score) || 0) },
    { label: "Hydration", value: Math.round(Number(row.hydration_level) || 0) },
    { label: "Medication adherence", value: adherenceToScore(row.medication_adherence) },
  ];
}

function PatientDetail() {
  const { patientId } = Route.useParams();
  const patient = useQuery({ queryKey: ["patient", patientId], queryFn: () => api.getPatient(patientId) });

  const [latestRow, setLatestRow] = useState<any | null>(null);
  const [trendRows, setTrendRows] = useState<{ timestamp: string; health_score: number }[]>([]);
  const [alertRows, setAlertRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"6h" | "24h" | "7d">("24h");

  const [editForm, setEditForm] = useState({ name: "", age: "", city: "" });
  const [editLoaded, setEditLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const seenAlertIds = useRef<Set<string>>(new Set());

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [latestRes, trendRes, alertsRes] = await Promise.all([
        supabase.from("vitals_readings").select("*").eq("patient_id", patientId)
          .order("timestamp", { ascending: false }).limit(1),
        supabase.from("vitals_readings").select("health_score,timestamp").eq("patient_id", patientId)
          .order("timestamp", { ascending: false }).limit(288),
        supabase.from("alerts").select("*").eq("patient_id", patientId)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      setLatestRow(latestRes.data?.[0] ?? null);
      setTrendRows(((trendRes.data ?? []) as any[]).slice().reverse());
      const alerts = (alertsRes.data ?? []) as any[];
      setAlertRows(alerts);
      seenAlertIds.current = new Set(alerts.map((a) => a.id));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`patient-${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_readings", filter: `patient_id=eq.${patientId}` },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          setLatestRow(row);
          if (row.health_score != null && row.timestamp) {
            setTrendRows((prev) => [...prev, { health_score: Number(row.health_score), timestamp: row.timestamp }].slice(-2016));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts", filter: `patient_id=eq.${patientId}` },
        (payload: any) => {
          const row = payload?.new ?? {};
          if (row.id && seenAlertIds.current.has(row.id)) return;
          if (row.id) seenAlertIds.current.add(row.id);
          setAlertRows((prev) => [row, ...prev].slice(0, 20));
          const isCrit = row.severity === "critical";
          const Icon = BellIconForSeverity(row.severity);
          toast(row.message ?? "New alert", {
            description: "just now",
            duration: isCrit ? Infinity : 5000,
            icon: <Icon className="h-4 w-4" style={{ color: isCrit ? "#EF4444" : row.severity === "warning" ? "#F59E0B" : "#06B6D4" }} />,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId]);

  const ack = async (id: string) => {
    setAlertRows((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    await supabase.from("alerts").update({ acknowledged: true }).eq("id", id);
  };

  const vitals = useMemo(() => buildVitals(latestRow), [latestRow]);
  const lifestyle = useMemo(() => buildLifestyle(latestRow), [latestRow]);

  const trendData = useMemo(() => {
    const now = Date.now();
    const windowMs = range === "6h" ? 6 * 3600e3 : range === "24h" ? 24 * 3600e3 : 7 * 24 * 3600e3;
    return trendRows
      .filter((r) => r.timestamp && now - new Date(r.timestamp).getTime() <= windowMs)
      .map((r) => ({
        ts: new Date(r.timestamp).getTime(),
        score: Math.round(Number(r.health_score) || 0),
      }));
  }, [trendRows, range]);

  const p = patient.data;

  useEffect(() => {
    if (p && !editLoaded) {
      setEditForm({ name: p.name ?? "", age: p.age != null ? String(p.age) : "", city: p.city ?? "" });
      setEditLoaded(true);
    }
  }, [p, editLoaded]);

  const saveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const ageNum = editForm.age === "" ? null : Number(editForm.age);
    if (ageNum != null && (!Number.isFinite(ageNum) || ageNum <= 0)) {
      setEditError("Age must be a positive number.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({ name: editForm.name.trim(), age: ageNum, city: editForm.city.trim() })
      .eq("id", patientId);
    setSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    toast.success("Changes saved");
    patient.refetch();
  };

  const score = Math.round(latestRow?.health_score ?? p?.health_score ?? 0);
  const scoreColor =
    score < 40 ? "#EF4444" :
    score < 60 ? "#F59E0B" :
    score < 75 ? "#3B82F6" :
    score < 90 ? "#10B981" : "#06B6D4";
  const lastUpdated = latestRow?.timestamp
    ? new Date(latestRow.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "just now";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* HERO */}
      <section
        className="relative mt-5 overflow-hidden rounded-3xl border p-6 md:p-10"
        style={{
          background: "rgba(15,22,40,0.8)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full"
          style={{ background: `radial-gradient(circle, ${scoreColor} 0%, transparent 65%)`, opacity: 0.12 }}
        />
        <div className="relative flex flex-col-reverse items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            {patient.isLoading ? (
              <Skeleton className="h-9 w-56" />
            ) : (
              <>
                <h1 className="font-display text-text-primary" style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {p?.name}
                </h1>
                <p className="mt-2 text-sm text-text-secondary">
                  {p?.age} years · {p?.city}
                  {p?.emergency_contact?.phone && (
                    <span className="ml-2 inline-flex items-center gap-1.5 text-text-secondary">
                      <Phone className="h-3 w-3" /> {p.emergency_contact.phone}
                    </span>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(latestRow?.predicted_disease ?? p?.predicted_condition) && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{ background: "rgba(139,92,246,0.15)", border: "0.5px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }}
                    >
                      <Shield className="h-3 w-3" /> {latestRow?.predicted_disease ?? p?.predicted_condition}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Clock className="h-3 w-3" /> Last reading {lastUpdated}
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {p?.emergency_contact?.phone && (
                    <motion.a
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      href={`tel:${p.emergency_contact.phone}`}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-cyan-300"
                      style={{ borderColor: "rgba(6,182,212,0.4)", background: "rgba(6,182,212,0.06)" }}
                    >
                      <Phone className="h-4 w-4" /> Call Lakshya
                    </motion.a>
                  )}
                  <Link to="/doctors" className="block">
                    <motion.span
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 8px 24px rgba(139,92,246,0.35)" }}
                    >
                      <Video className="h-4 w-4" /> Connect Doctor
                    </motion.span>
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="shrink-0">
            <HealthScoreRing score={score} size={200} strokeWidth={12} />
          </div>
        </div>
      </section>

      {/* VITALS GRID */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary">Live vitals</h2>
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden" animate="show"
          className="grid grid-cols-2 gap-3 md:grid-cols-3"
        >
          {vitals.map((v: any) => {
            const Icon = ICON_MAP[v.metric] ?? Activity;
            return (
              <motion.div key={v.metric} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                <VitalCard
                  icon={Icon}
                  label={LABEL_MAP[v.metric] ?? v.metric}
                  value={v.value}
                  unit={UNIT_MAP[v.metric] ?? ""}
                  status={v.status}
                  trend={0}
                  decimals={v.decimals ?? 0}
                  iconAnimation={ANIM_MAP[v.metric]}
                  history={[]}
                />
              </motion.div>
            );
          })}
          {loading && vitals.length === 0 && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </motion.div>
      </section>

      {/* TREND CHART */}
      <section className="mt-8 rounded-2xl glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Health score · {range}</h2>
          <div className="flex gap-1 rounded-xl bg-white/5 p-1 text-[11px]">
            {(["6h", "24h", "7d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-2.5 py-1 ${range === r ? "bg-cyan-500/20 text-cyan-300" : "text-text-secondary"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          {trendData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={(t: number) =>
                    range === "7d"
                      ? new Date(t).toLocaleDateString([], { month: "short", day: "numeric" })
                      : new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }
                  tick={{ fill: "#8892A4", fontSize: 10 }}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#8892A4", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                <Tooltip
                  contentStyle={{ background: "#162035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#8892A4" }}
                  labelFormatter={(t: number) => new Date(t).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  isAnimationActive
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* LIFESTYLE */}
      <section className="mt-8 rounded-2xl glass p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">Lifestyle</h2>
        <div className="space-y-3">
          {lifestyle.map((m: any) => {
            const v = m.invert ? 100 - m.value : m.value;
            const color = v > 75 ? "#10B981" : v > 50 ? "#06B6D4" : v > 30 ? "#F59E0B" : "#EF4444";
            return (
              <div key={m.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-text-secondary">{m.label}</span>
                  <span className="font-mono text-text-primary">{m.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, m.value))}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 12px ${color}80` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PatientAlertFeed alerts={alertRows as any} onAck={ack} />

      <section className="mt-8 rounded-2xl glass p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">Edit profile</h2>
        <form onSubmit={saveChanges} className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Name</Label>
            <Input id="ep-name" value={editForm.name} maxLength={100} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-age">Age</Label>
            <Input id="ep-age" type="number" min={0} max={130} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-city">City</Label>
            <Input id="ep-city" value={editForm.city} maxLength={100} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
          </div>
          {editError && <p className="md:col-span-3 text-sm text-red-400">{editError}</p>}
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </section>

      <Chatbot patientId={patientId} />
    </div>
  );
}
