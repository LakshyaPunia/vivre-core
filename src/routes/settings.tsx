import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Battery, Bell, Mail, MessageSquare, Pill, Users } from "lucide-react";
import { Chatbot } from "@/components/vivre/Chatbot";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Vivre" }] }),
  component: SettingsPage,
});

function Section({ title, icon: Icon, children }: any) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="rounded-2xl glass p-5"
    >
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-secondary">
        <Icon className="h-3.5 w-3.5 text-cyan-400" /> {title}
      </h2>
      {children}
    </motion.section>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-light">Patient <span className="font-semibold">profile</span></h1>
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden" animate="show"
        className="mt-6 space-y-4"
      >
        <Section title="Patient information" icon={Users}>
          <form className="grid gap-3 sm:grid-cols-2">
            <input defaultValue="Ruth Thomas" className="rounded-xl bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <input defaultValue="76" type="number" className="rounded-xl bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <input defaultValue="Chicago" className="sm:col-span-2 rounded-xl bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <motion.button whileTap={{ scale: 0.95 }} className="sm:col-span-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-[#06121a]">
              Save changes
            </motion.button>
          </form>
        </Section>

        <Section title="Linked family" icon={Users}>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span>Sarah Thomas (you)</span><span className="text-xs text-text-muted">Owner</span></li>
            <li className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span>Mike Thomas</span><span className="text-xs text-text-muted">Viewer</span></li>
          </ul>
        </Section>

        <Section title="Medications" icon={Pill}>
          <ul className="space-y-2 text-sm">
            {["Lisinopril 10mg · daily", "Metformin 500mg · twice", "Atorvastatin 20mg · evening"].map((m) => (
              <li key={m} className="rounded-xl bg-white/5 px-3 py-2">{m}</li>
            ))}
          </ul>
        </Section>

        <Section title="Notifications" icon={Bell}>
          <div className="space-y-2 text-sm">
            {[
              { icon: Bell, label: "Push notifications", on: true },
              { icon: Mail, label: "Email summary", on: false },
              { icon: MessageSquare, label: "SMS for critical alerts", on: true },
            ].map((n) => (
              <label key={n.label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="flex items-center gap-2"><n.icon className="h-4 w-4 text-text-secondary" /> {n.label}</span>
                <input type="checkbox" defaultChecked={n.on} className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-white/10 transition-colors checked:bg-cyan-500" />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Wearable device" icon={Battery}>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3 text-sm">
            <div>
              <p className="font-medium">Vivre Band v2</p>
              <p className="text-xs text-text-secondary">Connected · firmware 2.1.4</p>
            </div>
            <div className="flex items-center gap-2 text-status-ok">
              <Battery className="h-4 w-4" /> 84%
            </div>
          </div>
        </Section>
      </motion.div>

      <Chatbot />
    </div>
  );
}
