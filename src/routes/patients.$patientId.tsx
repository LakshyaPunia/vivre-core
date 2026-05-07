import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/patients/$patientId")({
  head: () => ({ meta: [{ title: "Patient — Vivre" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [score, setScore] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [sending, setSending] = useState(false);

  const refreshVitals = () => api.getVitals(patientId).then(setVitals).catch(() => {});
  const refreshAlerts = () => api.getAlerts(patientId).then(setAlerts).catch(() => {});

  useEffect(() => {
    api.getPatient(patientId).then(setPatient).catch(() => {});
    api.getHealthScore(patientId).then(setScore).catch(() => {});
    refreshVitals();
    refreshAlerts();

    const channel = supabase
      .channel(`patient-${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vitals_readings", filter: `patient_id=eq.${patientId}` }, refreshVitals)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `patient_id=eq.${patientId}` }, refreshAlerts)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    setMessages((m) => [...m, userMsg]);
    setChatInput("");
    setSending(true);
    try {
      const res = await api.chat(userMsg.content, patientId);
      setMessages((m) => [...m, { role: "assistant", content: res.message ?? res.reply ?? JSON.stringify(res) }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const ack = async (id: string) => {
    await api.acknowledgeAlert(id).catch(() => {});
    refreshAlerts();
  };

  return (
    <div>
      <Link to="/">← Back</Link>
      <section>
        <h1>{patient?.name ?? "Loading..."}</h1>
        <p>{patient?.age} · {patient?.city}</p>
        <p>Health score: {score?.score ?? patient?.health_score ?? "—"}</p>
        <p>Predicted: {patient?.predicted_condition ?? "—"}</p>
        <Link to="/patients/$patientId/location" params={{ patientId }}>View location</Link>
      </section>

      <section>
        <h2>Live Vitals</h2>
        <ul>
          {vitals.map((v) => (
            <li key={v.id ?? `${v.metric}-${v.recorded_at}`}>
              {v.metric}: {v.value} {v.unit ?? ""} ({v.status ?? "normal"})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Alerts</h2>
        <ul>
          {alerts.map((a) => (
            <li key={a.id}>
              [{a.severity}] {a.message} — {a.created_at}
              {!a.acknowledged && <button onClick={() => ack(a.id)}>Acknowledge</button>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>AI Chat</h2>
        <div>
          {messages.map((m, i) => (
            <p key={i}><b>{m.role}:</b> {m.content}</p>
          ))}
          {sending && <p>...</p>}
        </div>
        <form onSubmit={sendChat}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about this patient..." />
          <button type="submit" disabled={sending}>Send</button>
        </form>
      </section>
    </div>
  );
}