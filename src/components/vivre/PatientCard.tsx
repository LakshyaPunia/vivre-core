import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Heart, Activity, Droplet } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { EcgSparkline } from "./EcgSparkline";

const scoreColor = (s: number) => {
  if (s < 40) return { hex: "#EF4444", band: "Critical" };
  if (s < 60) return { hex: "#F59E0B", band: "Poor" };
  if (s < 75) return { hex: "#3B82F6", band: "Fair" };
  if (s < 90) return { hex: "#10B981", band: "Good" };
  return { hex: "#06B6D4", band: "Excellent" };
};

const statusHex = (s?: string) =>
  s === "crit" ? "#EF4444" : s === "warn" ? "#F59E0B" : "#10B981";

const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  RT: ["#0891B2", "#06B6D4"],
  HW: ["#DC2626", "#EF4444"],
  DC: ["#0D9488", "#14B8A6"],
};

function avatarGradient(initials: string, fallback: string): string {
  const pair = AVATAR_GRADIENTS[initials];
  if (pair) return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
  return `linear-gradient(135deg, ${fallback}, ${fallback}aa)`;
}

function relativeTime(iso?: string) {
  if (!iso) return "just now";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function BigRing({ score }: { score: number }) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { hex, band } = scoreColor(score);
  const mv = useMotionValue(0);
  const offset = useTransform(mv, (v) => c - (v / 100) * c);
  const [display, setDisplay] = useState(0);
  const filterId = useId().replace(/:/g, "");
  useEffect(() => {
    const ctrl = animate(mv, score, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return ctrl.stop;
  }, [score, mv]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="relative -rotate-90" style={{ overflow: "visible" }}>
        <defs>
          <filter id={`glow-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a2235" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={hex} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          filter={`url(#glow-${filterId})`}
          style={{ strokeDashoffset: offset, color: hex }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold tabular-nums text-text-primary" style={{ fontSize: 36, lineHeight: 1 }}>
          {display}
        </span>
        <span className="mt-1.5 text-[10px] font-medium uppercase text-text-secondary" style={{ letterSpacing: "0.15em", color: hex }}>
          {band}
        </span>
      </div>
    </div>
  );
}

export function PatientCard({ patient }: { patient: any }) {
  const score = Math.round(patient.health_score ?? 0);
  const { hex: scoreHex } = scoreColor(score);
  const isCritical = score < 40 || patient.has_unack_alert;
  const initials = String(patient.name ?? "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const vitals = patient.vitals ?? {};
  const cardShadow = isCritical
    ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.2), 0 0 40px rgba(239,68,68,0.08)"
    : "0 8px 32px rgba(0,0,0,0.4)";
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ scale: 1.025 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative self-start"
    >
      <Link
        to="/patients/$patientId"
        params={{ patientId: patient.id }}
        className="group relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[20px] border transition-colors duration-200 hover:border-cyan-400/25"
        style={{
          background: "rgba(15, 22, 40, 0.8)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.07)",
          boxShadow: cardShadow,
          padding: 28,
        }}
      >
        {/* center bloom matching ring colour — pure radial gradient, no hard edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[55%] h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: `radial-gradient(circle 120px at center, ${scoreHex}1A 0%, transparent 70%)`,
          }}
        />

        {/* TOP ROW */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-[13px] font-semibold text-white"
              style={{ background: avatarGradient(initials, scoreHex), boxShadow: `0 4px 12px ${scoreHex}33` }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-sans text-[17px] font-semibold leading-tight text-text-primary">{patient.name}</h3>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {patient.age} · {patient.city}
              </p>
            </div>
          </div>
          <span className="relative inline-flex h-2.5 w-2.5">
            {isCritical && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />}
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: scoreHex, boxShadow: `0 0 10px ${scoreHex}` }}
            />
          </span>
        </div>

        {/* HERO RING */}
        <div className="relative mb-4 mt-4 flex flex-1 items-center justify-center">
          <BigRing score={score} />
        </div>

        {/* Live ECG sparkline */}
        <div className="relative -mb-1 h-9">
          <EcgSparkline data={patient.hr_history ?? []} color={scoreHex} />
        </div>

        {/* DIVIDER */}
        <div className="relative -mx-7 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* VITALS */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Stat icon={Heart} label="Heart Rate" value={vitals.heart_rate?.value} unit="bpm" status={vitals.heart_rate?.status} />
          <Stat icon={Activity} label="SpO₂" value={vitals.spo2?.value} unit="%" status={vitals.spo2?.status} />
          <Stat icon={Droplet} label="BP" value={vitals.blood_pressure?.value} unit="mmHg" status={vitals.blood_pressure?.status} />
        </div>

        {/* BOTTOM */}
        <div className="relative mt-5 flex items-center justify-between gap-2">
          {patient.predicted_condition ? (
            <span
              className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "rgba(6,182,212,0.12)",
                border: "0.5px solid rgba(6,182,212,0.4)",
                color: "#22d3ee",
              }}
            >
              {patient.predicted_condition}
            </span>
          ) : <span />}
          <span className="text-[11px] text-text-secondary/70">{relativeTime(patient.updated_at)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, unit, status }: any) {
  const color = statusHex(status);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className="h-4 w-4 text-text-secondary/60" />
      <div className="font-mono leading-none" style={{ color, fontSize: 18, fontWeight: 500 }}>
        {value ?? "—"}
        <span className="ml-0.5 text-[10px] text-text-secondary/60">{unit}</span>
      </div>
      <div className="text-[10px] text-text-secondary/60">{label}</div>
    </div>
  );
}
