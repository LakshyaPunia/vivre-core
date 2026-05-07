import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, Check, Droplet, Heart, ShieldCheck, Wind, Zap,
} from "lucide-react";

type Alert = {
  id: string;
  severity: "critical" | "warning" | string;
  message: string;
  created_at?: string;
  acknowledged?: boolean;
  metric?: string;
  type?: string;
};

function relativeTime(iso?: string): string {
  if (!iso) return "just now";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function pickIcon(a: Alert) {
  const k = `${a.metric ?? ""} ${a.type ?? ""} ${a.message ?? ""}`.toLowerCase();
  if (/(spo2|sp02|oxygen|breath|respir)/.test(k)) return Wind;
  if (/(heart|hr|pulse|tachy|brady)/.test(k)) return Heart;
  if (/(blood pressure|bp|hypertens|hypotens|systolic|diastolic)/.test(k)) return Activity;
  if (/(fall|fell)/.test(k)) return AlertTriangle;
  if (/(glucose|sugar|hyperglyc|hypoglyc)/.test(k)) return Droplet;
  return Zap;
}

const STATUS = {
  critical: { color: "#EF4444", wash: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", chipBg: "rgba(239,68,68,0.15)" },
  warning:  { color: "#F59E0B", wash: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)", chipBg: "rgba(245,158,11,0.15)" },
  info:     { color: "#06B6D4", wash: "rgba(6,182,212,0.08)",  border: "rgba(255,255,255,0.06)", chipBg: "rgba(6,182,212,0.15)" },
} as const;

function statusOf(a: Alert) {
  if (a.severity === "critical") return STATUS.critical;
  if (a.severity === "warning") return STATUS.warning;
  return STATUS.info;
}

function AlertRow({ alert, onAck, isNew }: { alert: Alert; onAck?: (id: string) => void; isNew?: boolean }) {
  const Icon = pickIcon(alert);
  const s = statusOf(alert);
  const isCrit = alert.severity === "critical";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{
        opacity: alert.acknowledged ? 0.55 : 1,
        x: 0,
        boxShadow: isNew
          ? ["0 0 0 1px rgba(6,182,212,0.6)", "0 0 0 1px rgba(255,255,255,0)"]
          : isCrit ? "0 0 24px rgba(239,68,68,0.12)" : "0 0 0 rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, x: 120, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="relative flex items-start gap-3 overflow-hidden"
      style={{
        background: `linear-gradient(90deg, ${s.wash} 0%, transparent 40%), rgba(15,22,40,0.6)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 14,
        border: `1px solid ${s.border}`,
        padding: "16px 20px",
      }}
    >
      <motion.div
        animate={isCrit ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
        transition={isCrit ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="grid shrink-0 place-items-center rounded-full"
        style={{ width: 32, height: 32, background: `${s.color}26` }}
      >
        <Icon className="h-4 w-4" style={{ color: s.color }} />
      </motion.div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>
          {alert.message}
        </p>
        <p className="mt-0.5 text-[12px] text-text-secondary">{relativeTime(alert.created_at)}</p>
      </div>

      {!alert.acknowledged && onAck && (
        <motion.button
          onClick={() => onAck(alert.id)}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(16,185,129,0.15)" }}
          whileTap={{ scale: 0.95 }}
          className="grid shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:text-status-ok"
          style={{ width: 28, height: 28, background: "rgba(255,255,255,0.05)" }}
          aria-label="Resolve alert"
        >
          <Check className="h-3.5 w-3.5" />
        </motion.button>
      )}
    </motion.div>
  );
}

export function PatientAlertFeed({
  alerts,
  onAck,
}: {
  alerts: Alert[];
  onAck: (id: string) => void;
}) {
  const unresolved = useMemo(() => alerts.filter((a) => !a.acknowledged), [alerts]);
  const hasCritical = unresolved.some((a) => a.severity === "critical");

  // Track newly arrived alerts for cyan flash
  const seen = useRef<Set<string>>(new Set(alerts.map((a) => a.id)));
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fresh: string[] = [];
    for (const a of alerts) if (!seen.current.has(a.id)) fresh.push(a.id);
    if (fresh.length) {
      fresh.forEach((id) => seen.current.add(id));
      setNewIds((prev) => new Set([...prev, ...fresh]));
      const t = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          fresh.forEach((id) => next.delete(id));
          return next;
        });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [alerts]);

  return (
    <section className="mt-8">
      <header className="mb-3 flex items-center justify-between">
        <h2
          className="text-text-secondary"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Alert Feed
        </h2>
        {unresolved.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            {hasCritical && (
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
            )}
            {unresolved.length} active
          </span>
        )}
      </header>

      {unresolved.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative grid place-items-center overflow-hidden rounded-2xl py-12 text-center"
          style={{
            background: "rgba(15,22,40,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(240px circle at 50% 50%, rgba(16,185,129,0.18) 0%, transparent 70%)" }}
          />
          <div className="relative grid place-items-center" style={{ width: 48, height: 48, borderRadius: 9999, background: "rgba(16,185,129,0.2)" }}>
            <ShieldCheck className="h-6 w-6 text-status-ok" />
          </div>
          <p className="relative mt-3 text-[16px] font-semibold text-text-primary" style={{ fontFamily: "Inter, sans-serif" }}>
            All clear
          </p>
          <p className="relative mt-1 text-[13px] text-text-secondary">No active alerts for this patient</p>
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col"
          style={{ gap: 10 }}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          <AnimatePresence initial={false}>
            {alerts.map((a) => (
              <motion.div key={a.id} variants={{ hidden: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0 } }}>
                <AlertRow alert={a} onAck={onAck} isNew={newIds.has(a.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
