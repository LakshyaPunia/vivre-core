import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vivre — Dashboard" },
      { name: "description", content: "Live health overview for your loved ones." },
    ],
  }),
  component: Index,
});

function Index() {
  const [patients, setPatients] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listPatients().then(setPatients).catch((e) => setError(e.message));
    const channel = supabase
      .channel("vitals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "vitals_readings" }, () => {
        api.listPatients().then(setPatients).catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <header>
        <h1>Vivre Dashboard</h1>
        <nav>
          <Link to="/alerts">Alerts</Link> | <Link to="/doctors">Doctors</Link> |{" "}
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      {error && <p>Error: {error}</p>}
      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            <Link to="/patients/$patientId" params={{ patientId: p.id }}>
              {p.name} — score {p.health_score ?? "—"}
            </Link>
          </li>
        ))}
      </ul>
      <button>Add Patient</button>
    </div>
  );
}
