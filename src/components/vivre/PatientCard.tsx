import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { HealthScoreRing } from "./HealthScoreRing";
import { Heart, Activity, Droplet } from "lucide-react";

const bandColor = (s: number) => {
  if (s < 40) return "from-red-500/40 to-red-700/40 ring-red-400/50";
  if (s < 60) return "from-amber-500/40 to-amber-700/40 ring-amber-400/50";
  if (s < 75) return "from-blue-500/40 to-blue-700/40 ring-blue-400/50";
  if (s < 90) return "from-emerald-500/40 to-emerald-700/40 ring-emerald-400/50";
  return "from-cyan-400/40 to-cyan-600/40 ring-cyan-300/60";
};

const dotClass = (s?: string) =>
  s === "crit" ? "bg-status-crit shadow-[0_0_8px_var(--status-crit-glow)]"
  : s === "warn" ? "bg-status-warn shadow-[0_0_8px_var(--status-warn-glow)]"
  : "bg-status-ok shadow-[0_0_8px_var(--status-ok-glow)]";

function relativeTime(iso?: string) {
  if (!iso) return "just now";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function PatientCard({ patient }: { patient: any }) {
  const score = Math.round(patient.health_score ?? 0);
  const initials = String(patient.name ?? "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const vitals = patient.vitals ?? {};
  const hasAlert = !!patient.has_unack_alert || !!patient.active_alert;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {hasAlert && (
        <span className="absolute right-3 top-3 z-10 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        </span>
      )}
      <Link
        to="/patients/$patientId"
        params={{ patientId: patient.id }}
        className="block rounded-2xl border border-white/[0.08] bg-[#162035]/70 p-5 backdrop-blur-xl transition hover:border-cyan-400/60 hover:shadow-[0_8px_32px_-8px_var(--cyan-glow)]"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ring-2 font-mono text-sm font-semibold ${bandColor(score)}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold text-text-primary">{patient.name}</h3>
            <p className="text-xs text-text-secondary">
              {patient.age} · {patient.city}
            </p>
          </div>
          <HealthScoreRing score={score} size={84} strokeWidth={6} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-3">
          <Stat icon={Heart} label="HR" value={vitals.heart_rate?.value} unit="bpm" status={vitals.heart_rate?.status} />
          <Stat icon={Activity} label="SpO₂" value={vitals.spo2?.value} unit="%" status={vitals.spo2?.status} />
          <Stat icon={Droplet} label="BP" value={vitals.blood_pressure?.value} unit="mmHg" status={vitals.blood_pressure?.status} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {patient.predicted_condition ? (
            <span className="inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
              {patient.predicted_condition}
            </span>
          ) : <span />}
          <span className="text-[10px] text-text-muted">{relativeTime(patient.updated_at)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, unit, status }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass(status)}`} />
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <div className="font-mono text-sm text-text-primary">
        {value ?? "—"}<span className="ml-0.5 text-[9px] text-text-muted">{unit}</span>
      </div>
    </div>
  );
}
