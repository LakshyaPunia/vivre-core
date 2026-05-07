import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellOff,
  Check,
  Flame,
  Info,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Chatbot } from "@/components/vivre/Chatbot";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts Centre — Vivre" }] }),
  component: AlertsPage,
});

type Filter = "all" | "critical" | "warning" | "acknowledged";

const SEV: Record<string, { color: string; label: string; Icon: any }> = {
  critical: { color: "#EF4444", label: "Critical", Icon: Flame },
  high: { color: "#F97316", label: "High", Icon: TriangleAlert },
  warning: { color: "#F59E0B", label: "Warning", Icon: AlertTriangle },
  info: { color: "#06B6D4", label: "Info", Icon: Info },
};

function sevOf(a: any) {
  return SEV[(a.severity ?? "info").toLowerCase()] ?? SEV.info;
}

function formatRelativeTime(iso: string) {
  const diff = (Date.now() - +new Date(iso)) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 172800) return "yesterday";
  return `${Math.round(diff / 86400)} days ago`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function bandFor(score: number) {
  if (score < 40) return { color: "#EF4444", label: "Critical" };
  if (score < 60) return { color: "#F59E0B", label: "Poor" };
  if (score < 75) return { color: "#3B82F6", label: "Fair" };
  if (score < 90) return { color: "#10B981", label: "Good" };
  return { color: "#06B6D4", label: "Excellent" };
}

function MiniRing({ score }: { score: number }) {
  const size = 30, sw = 3, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const { color } = bandFor(score);
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={sw} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

function PatientAvatar({ name, severity }: { name: string; severity: "crit" | "warn" | "ok" }) {
  const ring = severity === "crit" ? "#EF4444" : severity === "warn" ? "#F59E0B" : "#06B6D4";
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        border: `2px solid ${ring}`,
        boxShadow: `0 0 10px ${ring}55`,
        fontSize: 12,
      }}
    >
      {initials(name)}
    </div>
  );
}

function FilterPill({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      onClick={onClick}
      className="rounded-full text-[13px] font-medium transition"
      style={{
        padding: "6px 18px",
        background: active ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(6,182,212,0.45)" : "rgba(255,255,255,0.08)"}`,
        color: active ? "#06B6D4" : "#94A3B8",
        boxShadow: active ? "0 0 12px rgba(6,182,212,0.2)" : "none",
      }}
    >
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </motion.button>
  );
}

function AlertCard({
  alert, onAck, index,
}: { alert: any; onAck: (id: string) => void; index: number }) {
  const sev = sevOf(alert);
  const { Icon } = sev;
  const [ackd, setAckd] = useState<boolean>(!!alert.acknowledged);

  const handleAck = () => {
    if (ackd) return;
    setAckd(true);
    onAck(alert.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: ackd ? 0.4 : 1, y: 0, x: ackd ? -8 : 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        backdropFilter: "blur(12px)",
        padding: "14px 16px",
        boxShadow: sev.label === "Critical" ? "0 0 24px rgba(239,68,68,0.08)" : "none",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{
          width: 4,
          background: `linear-gradient(to bottom, ${sev.color}, transparent)`,
          opacity: 0.6,
        }}
      />
      <div className="flex items-center gap-4 pl-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `${sev.color}1F`,
            border: `1px solid ${sev.color}40`,
            boxShadow: `0 0 12px ${sev.color}33`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: sev.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-white">
            {alert.title ?? `${sev.label} ${alert.metric ?? "Alert"}`}
          </div>
          <div className="truncate text-[13px]" style={{ color: "#94A3B8" }}>
            {alert.message ?? alert.description}
          </div>
          <div className="mt-1 font-mono text-[12px]" style={{ color: "#64748B" }}>
            {formatRelativeTime(alert.created_at)}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.08 }}
          onClick={handleAck}
          aria-label="Acknowledge"
          className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${ackd ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.12)"}`,
          }}
        >
          <Check
            className="h-4 w-4 transition group-hover:text-cyan-400"
            style={{ color: ackd ? "#06B6D4" : "#94A3B8" }}
            strokeWidth={ackd ? 3 : 2}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

function AlertsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: patients = [] } = useQuery({ queryKey: ["patients"], queryFn: () => api.listPatients() });
  const alertsQ = useQuery({
    queryKey: ["all-alerts", patients.map((p: any) => p.id).join(",")],
    queryFn: async () => {
      const all = await Promise.all(patients.map((p: any) => api.getAlerts(p.id)));
      return all.flat().sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
    },
    enabled: patients.length > 0,
  });

  useEffect(() => {
    const ch = supabase
      .channel("alerts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => alertsQ.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [alertsQ]);

  const all = alertsQ.data ?? [];
  const counts = useMemo(() => ({
    all: all.length,
    critical: all.filter((a: any) => sevOf(a).label === "Critical" && !a.acknowledged).length,
    warning: all.filter((a: any) => ["Warning", "High"].includes(sevOf(a).label) && !a.acknowledged).length,
    acknowledged: all.filter((a: any) => a.acknowledged).length,
  }), [all]);

  const unread = all.filter((a: any) => !a.acknowledged).length;

  const filtered = all.filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "acknowledged") return a.acknowledged;
    if (filter === "critical") return sevOf(a).label === "Critical" && !a.acknowledged;
    if (filter === "warning") return ["Warning", "High"].includes(sevOf(a).label) && !a.acknowledged;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of filtered) {
      const k = a.patient_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const ack = async (id: string) => { await api.acknowledgeAlert(id); alertsQ.refetch(); };

  const ackAllVisible = async () => {
    const targets = filtered.filter((a: any) => !a.acknowledged);
    await Promise.all(targets.map((a: any) => api.acknowledgeAlert(a.id)));
    alertsQ.refetch();
  };

  const visibleUnacked = filtered.filter((a: any) => !a.acknowledged).length;

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute"
          style={{
            top: -120, left: -120, width: 600, height: 600,
            background: "radial-gradient(closest-side, rgba(6,182,212,0.18), transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: -160, right: -160, width: 600, height: 600,
            background: "radial-gradient(closest-side, rgba(139,92,246,0.14), transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
            Alerts Centre
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "#94A3B8" }}>
            Real-time health notifications across all patients
          </p>
        </div>
        <span
          className="shrink-0 rounded-full font-medium"
          style={{
            background: "rgba(6,182,212,0.15)",
            border: "1px solid rgba(6,182,212,0.35)",
            color: "#06B6D4",
            padding: "4px 12px",
            fontSize: 13,
          }}
        >
          {unread} unread
        </span>
      </div>

      {/* Filter pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        <FilterPill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label="Critical" count={counts.critical} active={filter === "critical"} onClick={() => setFilter("critical")} />
        <FilterPill label="Warning" count={counts.warning} active={filter === "warning"} onClick={() => setFilter("warning")} />
        <FilterPill label="Acknowledged" count={counts.acknowledged} active={filter === "acknowledged"} onClick={() => setFilter("acknowledged")} />
      </div>

      {/* Groups */}
      <div className="mt-6 space-y-6">
        {grouped.map(([pid, alerts]) => {
          const patient = patients.find((p: any) => p.id === pid);
          const name = patient?.name ?? "Patient";
          const score = patient?.health_score ?? 70;
          const band = bandFor(score);
          const hasCrit = alerts.some((a: any) => sevOf(a).label === "Critical" && !a.acknowledged);
          const hasWarn = alerts.some((a: any) => ["Warning", "High"].includes(sevOf(a).label) && !a.acknowledged);
          const sev: "crit" | "warn" | "ok" = hasCrit ? "crit" : hasWarn ? "warn" : "ok";

          return (
            <div key={pid}>
              <div
                className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-xl px-3 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <PatientAvatar name={name} severity={sev} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-semibold text-white">{name}</div>
                </div>
                <MiniRing score={score} />
                <span
                  className="rounded-full text-[11px] font-medium whitespace-nowrap"
                  style={{
                    padding: "3px 10px",
                    background: `${band.color}1F`,
                    border: `1px solid ${band.color}40`,
                    color: band.color,
                  }}
                >
                  {band.label}
                </span>
                <Link
                  to="/patients/$patientId"
                  params={{ patientId: pid }}
                  className="ml-auto whitespace-nowrap text-[13px] font-medium hover:underline"
                  style={{ color: "#06B6D4" }}
                >
                  View Patient →
                </Link>
              </div>

              <div className="mt-3 space-y-3">
                <AnimatePresence initial={false}>
                  {alerts.map((a: any, i: number) => (
                    <AlertCard key={a.id} alert={a} onAck={ack} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "rgba(148,163,184,0.08)",
                border: "1px solid rgba(148,163,184,0.15)",
                boxShadow: "0 0 30px rgba(148,163,184,0.1)",
              }}
            >
              <BellOff className="h-7 w-7" style={{ color: "rgba(148,163,184,0.6)" }} />
            </div>
            <p className="mt-4 text-[16px]" style={{ color: "#94A3B8" }}>No {filter} alerts</p>
            <p className="mt-1 text-[13px]" style={{ color: "#64748B" }}>All clear for now</p>
          </motion.div>
        )}
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {visibleUnacked >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 z-40 -translate-x-1/2"
            style={{ bottom: 96 }}
          >
            <button
              onClick={ackAllVisible}
              className="flex items-center gap-2 text-[13px] font-medium text-white transition hover:bg-white/10"
              style={{
                background: "rgba(8,12,20,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                borderRadius: 14,
                padding: "10px 18px",
              }}
            >
              <Check className="h-4 w-4 text-cyan-400" />
              Acknowledge all {visibleUnacked} visible alerts
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Chatbot />
    </div>
  );
}
