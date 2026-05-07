import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { AlertItem } from "@/components/vivre/AlertItem";
import { Chatbot } from "@/components/vivre/Chatbot";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Vivre" }] }),
  component: AlertsPage,
});

type Filter = "all" | "critical" | "warning" | "acknowledged";

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

  const filtered = (alertsQ.data ?? []).filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "acknowledged") return a.acknowledged;
    return a.severity === filter && !a.acknowledged;
  });
  const patientName = (id: string) => patients.find((p: any) => p.id === id)?.name ?? "Patient";

  const ack = async (id: string) => { await api.acknowledgeAlert(id); alertsQ.refetch(); };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-light">
        Alerts <span className="font-semibold">centre</span>
      </h1>
      <p className="mt-1 text-sm text-text-secondary">Unified inbox across all linked patients.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", "critical", "warning", "acknowledged"] as Filter[]).map((f) => (
          <motion.button
            key={f}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-cyan-500 text-[#06121a] shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                : "bg-white/5 text-text-secondary hover:text-text-primary"
            }`}
          >
            {f}
          </motion.button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((a: any) => (
            <div key={a.id}>
              <Link
                to="/patients/$patientId"
                params={{ patientId: a.patient_id }}
                className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-text-muted hover:text-text-secondary"
              >
                {patientName(a.patient_id)} →
              </Link>
              <AlertItem alert={a} onAck={ack} />
            </div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="rounded-2xl glass glass-ok p-10 text-center">
            <Shield className="mx-auto mb-3 h-8 w-8 text-status-ok" />
            <p className="text-sm text-text-secondary">All clear — no active alerts.</p>
          </div>
        )}
      </div>

      <Chatbot />
    </div>
  );
}
