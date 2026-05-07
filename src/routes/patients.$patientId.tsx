import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  Heart, Wind, Gauge, Thermometer, Droplet, Activity,
  ArrowLeft, MapPin, Phone, Shield,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { HealthScoreRing } from "@/components/vivre/HealthScoreRing";
import { VitalCard } from "@/components/vivre/VitalCard";
import { AlertItem } from "@/components/vivre/AlertItem";
import { Chatbot } from "@/components/vivre/Chatbot";
import { Skeleton } from "@/components/vivre/Skeleton";

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

  useEffect(() => {
    const ch = supabase
      .channel(`patient-${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vitals_readings", filter: `patient_id=eq.${patientId}` }, () => vitals.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `patient_id=eq.${patientId}` }, () => alerts.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId, vitals, alerts]);

  const ack = async (id: string) => { await api.acknowledgeAlert(id); alerts.refetch(); };

  const p = patient.data;
  const score = Math.round(p?.health_score ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* HERO */}
      <section className="mt-5 rounded-3xl glass glass-cyan p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
          <HealthScoreRing score={score} size={180} strokeWidth={10} />
          <div className="flex-1 text-center md:text-left">
            {patient.isLoading ? (
              <Skeleton className="mx-auto h-8 w-56 md:mx-0" />
            ) : (
              <>
                <h1 className="font-display text-3xl font-semibold md:text-4xl">{p?.name}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {p?.age} · {p?.city}
                </p>
                {p?.predicted_condition && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
                    <Shield className="h-3 w-3" /> {p.predicted_condition}
                  </span>
                )}
              </>
            )}
            {p?.emergency_contact && (
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <div className="text-xs text-text-muted">
                  <p>Emergency contact</p>
                  <p className="text-text-secondary">{p.emergency_contact.name}</p>
                </div>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={`tel:${p.emergency_contact.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 px-4 py-2 text-sm font-medium text-[#06121a]"
                >
                  <Phone className="h-4 w-4" /> Call
                </motion.a>
                <Link
                  to="/patients/$patientId/location"
                  params={{ patientId }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  <MapPin className="h-4 w-4" /> Location
                </Link>
              </div>
            )}
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

      {/* ALERTS */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary">Alert feed</h2>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {(alerts.data ?? []).map((a: any) => (
              <AlertItem key={a.id} alert={a} onAck={ack} />
            ))}
          </AnimatePresence>
          {alerts.data?.length === 0 && (
            <div className="rounded-2xl glass glass-ok p-6 text-center text-sm text-text-secondary">
              <Shield className="mx-auto mb-2 h-6 w-6 text-status-ok" />
              All clear — no active alerts.
            </div>
          )}
        </div>
      </section>

      <Chatbot patientId={patientId} />
    </div>
  );
}
