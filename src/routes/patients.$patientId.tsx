import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
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
const ANIM_MAP: Record<string, "heartbeat" | "breathe" | "none"> = {
  heart_rate: "heartbeat", spo2: "breathe", blood_pressure: "none",
  temperature: "none", glucose: "none", respiratory_rate: "none",
};

function PatientDetail() {
  const { patientId } = Route.useParams();
  const patient = useQuery({ queryKey: ["patient", patientId], queryFn: () => api.getPatient(patientId) });
  const vitals = useQuery({ queryKey: ["vitals", patientId], queryFn: () => api.getVitals(patientId) });
  const alerts = useQuery({ queryKey: ["alerts", patientId], queryFn: () => api.getAlerts(patientId) });
  const trend = useQuery({ queryKey: ["trend", patientId], queryFn: () => api.getHealthTrend(patientId) });
  const lifestyle = useQuery({ queryKey: ["lifestyle", patientId], queryFn: () => api.getLifestyle(patientId) });

  const seenAlertIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const a of alerts.data ?? []) seenAlertIds.current.add(a.id);
  }, [alerts.data]);

  useEffect(() => {
    const ch = supabase
      .channel(`patient-${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_readings", filter: `patient_id=eq.${patientId}` },
        () => { vitals.refetch(); trend.refetch(); patient.refetch(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts", filter: `patient_id=eq.${patientId}` },
        (payload: any) => {
          const row = payload?.new ?? {};
          if (row.id && seenAlertIds.current.has(row.id)) return;
          if (row.id) seenAlertIds.current.add(row.id);
          const isCrit = row.severity === "critical";
          const Icon = isCrit ? AlertTriangle : BellIconForSeverity(row.severity);
          toast(row.message ?? "New alert", {
            description: "just now",
            duration: isCrit ? Infinity : 5000,
            icon: <Icon className="h-4 w-4" style={{ color: isCrit ? "#EF4444" : row.severity === "warning" ? "#F59E0B" : "#06B6D4" }} />,
          });
          alerts.refetch();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId, vitals, alerts, trend, patient]);

  const ack = async (id: string) => { await api.acknowledgeAlert(id); alerts.refetch(); };

  const p = patient.data;
  const score = Math.round(p?.health_score ?? 0);
  const scoreColor =
    score < 40 ? "#EF4444" :
    score < 60 ? "#F59E0B" :
    score < 75 ? "#3B82F6" :
    score < 90 ? "#10B981" : "#06B6D4";
  const lastUpdated = p?.updated_at
    ? new Date(p.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
                  {p?.predicted_condition && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{ background: "rgba(139,92,246,0.15)", border: "0.5px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }}
                    >
                      <Shield className="h-3 w-3" /> {p.predicted_condition}
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
          {(vitals.data ?? []).map((v: any) => {
            const Icon = ICON_MAP[v.metric] ?? Activity;
            return (
              <motion.div key={v.metric} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                <VitalCard
                  icon={Icon}
                  label={LABEL_MAP[v.metric] ?? v.metric}
                  value={v.value}
                  unit={v.unit}
                  status={v.status}
                  trend={v.trend ?? 0}
                  decimals={v.metric === "temperature" ? 1 : 0}
                  iconAnimation={ANIM_MAP[v.metric]}
                  history={v.history ?? []}
                />
              </motion.div>
            );
          })}
          {vitals.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </motion.div>
      </section>

      {/* TREND CHART */}
      <section className="mt-8 rounded-2xl glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Health score · 24h</h2>
          <div className="flex gap-1 rounded-xl bg-white/5 p-1 text-[11px]">
            {["6h", "24h", "7d"].map((r, i) => (
              <button key={r} className={`rounded-lg px-2.5 py-1 ${i === 1 ? "bg-cyan-500/20 text-cyan-300" : "text-text-secondary"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="h-56">
          {trend.data && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.data}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={{ fill: "#8892A4", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                <YAxis domain={[0, 100]} tick={{ fill: "#8892A4", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                <Tooltip
                  contentStyle={{ background: "#162035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#8892A4" }}
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
          {(lifestyle.data ?? []).map((m: any) => {
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
                    animate={{ width: `${m.value}%` }}
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

      <PatientAlertFeed alerts={alerts.data ?? []} onAck={ack} />

      <Chatbot patientId={patientId} />
    </div>
  );
}
