import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { AlertOctagon } from "lucide-react";
import { HealthScoreRing } from "./HealthScoreRing";

export function PatientCard({ patient }: { patient: any }) {
  const score = Math.round(patient.health_score ?? 0);
  const isCrit = score < 40;
  const initials = String(patient.name ?? "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to="/patients/$patientId"
        params={{ patientId: patient.id }}
        className={`block rounded-2xl glass p-5 transition ${isCrit ? "glass-crit" : "glass-cyan"}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 ring-2 ring-cyan-400/40 font-mono text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold text-text-primary">{patient.name}</h3>
            <p className="text-xs text-text-secondary">
              {patient.age} · {patient.city}
            </p>
            {patient.predicted_condition && (
              <span className="mt-2 inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                {patient.predicted_condition}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <HealthScoreRing score={score} size={96} strokeWidth={7} />
          <div className="text-right text-[11px] text-text-muted">
            <p>Updated</p>
            <p className="text-text-secondary">{patient.updated_at ? new Date(patient.updated_at).toLocaleTimeString() : "just now"}</p>
            {patient.active_alert && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-status-crit">
                <AlertOctagon className="h-3 w-3" /> {patient.active_alert}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
