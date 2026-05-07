import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Shield } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/patients_/$patientId/location")({
  head: () => ({ meta: [{ title: "Location — Vivre" }] }),
  component: LocationPage,
});

function LocationPage() {
  const { patientId } = Route.useParams();
  const loc = useQuery({ queryKey: ["loc", patientId], queryFn: () => api.getLocation(patientId) });
  const patient = useQuery({ queryKey: ["patient", patientId], queryFn: () => api.getPatient(patientId) });
  const initials = String(patient.data?.name ?? "??").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <Link to="/patients/$patientId" params={{ patientId }} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {patient.data?.name ?? "patient"}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-light">Live <span className="font-semibold">location</span></h1>

      <div className="relative mt-5 h-[60vh] overflow-hidden rounded-2xl glass glass-cyan">
        {/* faux map background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.18) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ripple"
              style={{ animationDelay: "0s" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ripple"
              style={{ animationDelay: "0.6s" }}
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 font-mono text-sm font-semibold text-white shadow-[0_0_30px_rgba(6,182,212,0.7)]"
            >
              {initials}
            </motion.div>
          </div>
        </div>

        <div className="absolute left-4 top-4 rounded-xl glass px-3 py-2 text-xs">
          <p className="text-text-secondary">Last updated</p>
          <p className="font-mono">{loc.data ? new Date(loc.data.updated_at).toLocaleTimeString() : "—"}</p>
        </div>
        <div className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-xl glass px-3 py-2 text-xs ${loc.data?.in_safe_zone ? "glass-ok" : "glass-crit"}`}>
          <Shield className={`h-3.5 w-3.5 ${loc.data?.in_safe_zone ? "text-status-ok" : "text-status-crit"}`} />
          {loc.data?.in_safe_zone ? "Within safe zone" : "Outside safe zone"}
        </div>
        <div className="absolute bottom-4 left-4 rounded-xl glass px-3 py-2 text-xs">
          <MapPin className="mr-1 inline h-3 w-3 text-cyan-400" />
          <span className="font-mono">{loc.data?.lat?.toFixed(4)}, {loc.data?.lng?.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
