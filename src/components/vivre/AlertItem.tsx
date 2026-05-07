import { motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Check } from "lucide-react";

export function AlertItem({
  alert,
  onAck,
}: {
  alert: { id: string; severity: "critical" | "warning" | string; message: string; created_at?: string; acknowledged?: boolean };
  onAck?: (id: string) => void;
}) {
  const isCrit = alert.severity === "critical";
  const Icon = isCrit ? AlertOctagon : AlertTriangle;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 && onAck) onAck(alert.id);
      }}
      className={`relative flex items-start gap-3 overflow-hidden rounded-2xl glass p-4 ${isCrit ? "glass-crit" : "glass-warn"} ${alert.acknowledged ? "opacity-60" : ""}`}
      style={{ borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: isCrit ? "#EF4444" : "#F59E0B" }}
    >
      <Icon className={`h-5 w-5 shrink-0 ${isCrit ? "text-status-crit" : "text-status-warn"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{alert.message}</p>
        {alert.created_at && <p className="mt-0.5 text-xs text-text-muted">{new Date(alert.created_at).toLocaleString()}</p>}
      </div>
      {!alert.acknowledged && onAck && (
        <button
          onClick={() => onAck(alert.id)}
          className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
        >
          <Check className="inline h-3 w-3" /> Resolve
        </button>
      )}
    </motion.div>
  );
}
