import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CountUp } from "./CountUp";

type Status = "ok" | "warn" | "crit";

const statusClass: Record<Status, string> = {
  ok: "glass glass-ok",
  warn: "glass glass-warn",
  crit: "glass glass-crit",
};
const statusText: Record<Status, string> = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  crit: "text-status-crit",
};

export function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  status = "ok",
  trend = 0,
  decimals = 0,
  iconAnimation,
  history = [],
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  status?: Status;
  trend?: number;
  decimals?: number;
  iconAnimation?: "heartbeat" | "breathe" | "none";
  history?: number[];
}) {
  const [flash, setFlash] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  useEffect(() => {
    if (value !== prevValue) {
      setFlash(true);
      setPrevValue(value);
      const t = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [value, prevValue]);

  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : ArrowRight;
  const trendColor = trend > 0 ? "text-status-ok" : trend < 0 ? "text-status-crit" : "text-text-muted";

  // heartbeat duration based on bpm
  const heartbeatStyle = iconAnimation === "heartbeat" && value > 0
    ? { animation: `heartbeat ${60000 / value}ms ease-in-out infinite` }
    : undefined;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden p-4 ${statusClass[status]} ${flash ? "ring-2 ring-cyan-400" : ""} transition-shadow`}
    >
      {iconAnimation === "breathe" && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-cyan-400/30 animate-breathe" />
      )}
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${statusText[status]}`} style={{ background: "rgba(255,255,255,0.04)" }}>
          <Icon className="h-5 w-5" style={heartbeatStyle} />
        </div>
        <AnimatePresence>
          {flash && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300"
            >
              ● Live
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`font-mono text-3xl font-medium ${statusText[status]}`} style={{ textShadow: `0 0 12px currentColor` }}>
          <CountUp value={value} decimals={decimals} />
        </span>
        <span className="text-xs text-text-secondary">{unit}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px]">
        <TrendIcon className={`h-3 w-3 ${trendColor}`} />
        <span className={trendColor}>{Math.abs(trend).toFixed(1)}%</span>
        <span className="text-text-muted">vs prev</span>
      </div>
      {history.length > 1 && <Sparkline data={history} status={status} />}
    </motion.div>
  );
}

function Sparkline({ data, status }: { data: number[]; status: Status }) {
  const w = 120, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const color = status === "crit" ? "#EF4444" : status === "warn" ? "#F59E0B" : "#10B981";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-8 w-full">
      <defs>
        <linearGradient id={`sg-${status}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#sg-${status})`} />
    </svg>
  );
}
