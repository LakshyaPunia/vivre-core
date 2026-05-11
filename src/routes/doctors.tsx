import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Phone, PhoneOff, Stethoscope, Video } from "lucide-react";
import { Chatbot } from "@/components/vivre/Chatbot";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/doctors")({
  head: () => ({ meta: [{ title: "Doctor Connect — Vivre" }] }),
  component: DoctorsPage,
});

const DOCTORS = [
  { id: "d1", name: "Dr. Anika Patel",   specialty: "Cardiology",     available: true,  initials: "AP" },
  { id: "d2", name: "Dr. Linh Nguyen",   specialty: "Geriatrics",     available: true,  initials: "LN" },
  { id: "d3", name: "Dr. Marco Romero",  specialty: "Endocrinology",  available: false, initials: "MR" },
  { id: "d4", name: "Dr. Sara Olson",    specialty: "Internal Med.",  available: true,  initials: "SO" },
];

function DoctorsPage() {
  const [inCall, setInCall] = useState<string | null>(null);
  const callDoc = DOCTORS.find((d) => d.id === inCall);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-light">Doctor <span className="font-semibold">connect</span></h1>
      <p className="mt-1 text-sm text-text-secondary">On-demand video consults with vetted clinicians.</p>

      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden" animate="show"
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        {DOCTORS.map((d) => (
          <motion.div
            key={d.id}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ scale: 1.02 }}
            className={`flex items-center gap-4 rounded-2xl glass p-4 ${d.available ? "glass-cyan" : ""}`}
          >
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-500 font-mono text-sm font-semibold text-white">
              {d.initials}
              {d.available && <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg-base bg-status-ok" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text-primary">{d.name}</p>
              <p className="text-xs text-text-secondary">
                <Stethoscope className="mr-1 inline h-3 w-3" /> {d.specialty}
              </p>
              <p className={`text-[11px] ${d.available ? "text-status-ok" : "text-text-muted"}`}>
                {d.available ? "Available now" : "Offline"}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              disabled={!d.available}
              onClick={() => setInCall(d.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-medium text-[#06121a] disabled:opacity-40"
            >
              <Video className="h-3.5 w-3.5" /> Connect
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {callDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm md:flex-row"
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-500 font-display text-4xl font-semibold text-white">
                {callDoc.initials}
              </div>
              <p className="mt-4 font-display text-xl">{callDoc.name}</p>
              <p className="text-sm text-text-secondary">{callDoc.specialty}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-status-ok">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-status-ok opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-status-ok" />
                </span>
                Connected
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setInCall(null)}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-status-crit px-6 py-3 text-sm font-semibold text-white"
              >
                <PhoneOff className="h-4 w-4" /> End call
              </motion.button>
            </motion.div>
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full border-t border-border-glass glass p-5 md:w-80 md:border-l md:border-t-0"
            >
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Live vitals</h3>
              <LiveVitalsSidebar />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Past sessions</h2>
        <div className="mt-3 rounded-2xl glass p-6 text-center text-sm text-text-secondary">
          <Phone className="mx-auto mb-2 h-5 w-5 text-text-muted" />
          No past sessions yet.
        </div>
      </div>

      <Chatbot />
    </div>
  );
}

function LiveVitalsSidebar() {
  const [hr, setHr] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [bp, setBp] = useState<string | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const apply = (row: any) => {
      if (row.heart_rate != null) setHr(Math.round(row.heart_rate));
      if (row.spo2 != null) setSpo2(Math.round(row.spo2));
      if (row.systolic_bp != null && row.diastolic_bp != null) {
        setBp(`${Math.round(row.systolic_bp)}/${Math.round(row.diastolic_bp)}`);
      }
      if (row.body_temp != null) setTemp(Number(row.body_temp));
    };

    (async () => {
      // Get most recently active patient
      const { data: latest } = await supabase
        .from("vitals_readings")
        .select("patient_id")
        .order("timestamp", { ascending: false })
        .limit(1);
      const id = latest?.[0]?.patient_id;
      if (!id || cancelled) return;
      setPatientId(id);

      const { data: row } = await supabase
        .from("vitals_readings")
        .select("heart_rate,spo2,systolic_bp,diastolic_bp,body_temp")
        .eq("patient_id", id)
        .order("timestamp", { ascending: false })
        .limit(1);
      if (row?.[0] && !cancelled) apply(row[0]);

      channel = supabase
        .channel(`call-vitals-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "vitals_readings", filter: `patient_id=eq.${id}` },
          (payload) => apply(payload.new),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ul className="mt-3 space-y-2 text-sm">
      <li className="flex justify-between"><span className="text-text-secondary">Heart rate</span><span className="font-mono">{hr ?? "—"} bpm</span></li>
      <li className="flex justify-between"><span className="text-text-secondary">SpO₂</span><span className="font-mono">{spo2 ?? "—"} %</span></li>
      <li className="flex justify-between"><span className="text-text-secondary">BP</span><span className="font-mono">{bp ?? "—"} mmHg</span></li>
      <li className="flex justify-between"><span className="text-text-secondary">Temp</span><span className="font-mono">{temp != null ? temp.toFixed(1) : "—"} °C</span></li>
    </ul>
  );
}
