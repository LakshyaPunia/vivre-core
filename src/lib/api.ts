import { DEMO_PATIENTS, DEMO_VITALS, DEMO_ALERTS, DEMO_HEALTH_TREND, DEMO_LIFESTYLE } from "./demo-data";

const API_BASE = "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch { return fallback; }
};

export const api = {
  listPatients: () => safe(request<any[]>("/patients"), DEMO_PATIENTS),
  getPatient: (id: string) =>
    safe(request<any>(`/patients/${id}`), DEMO_PATIENTS.find((p) => p.id === id) ?? DEMO_PATIENTS[0]),
  getVitals: (id: string) => safe(request<any[]>(`/patients/${id}/vitals`), DEMO_VITALS[id] ?? []),
  getHealthScore: (id: string) =>
    safe(request<any>(`/patients/${id}/health-score`), { score: DEMO_PATIENTS.find((p) => p.id === id)?.health_score ?? 0 }),
  getHealthTrend: async (id: string) => {
    const base = DEMO_PATIENTS.find((p) => p.id === id)?.health_score ?? 70;
    return DEMO_HEALTH_TREND(base);
  },
  getLifestyle: async (id: string) => DEMO_LIFESTYLE(id),
  getAlerts: (id: string) => safe(request<any[]>(`/patients/${id}/alerts`), DEMO_ALERTS[id] ?? []),
  acknowledgeAlert: (id: string) =>
    safe(request<any>(`/alerts/${id}/acknowledge`, { method: "PATCH" }), { ok: true, id }),
  getLocation: (id: string) =>
    safe(request<any>(`/patients/${id}/location`), {
      lat: 41.8781,
      lng: -87.6298,
      updated_at: new Date().toISOString(),
      in_safe_zone: true,
    }),
  chat: async (message: string, _patientId?: string) => {
    try {
      return await request<any>("/chat", { method: "POST", body: JSON.stringify({ message, patient_id: _patientId }) });
    } catch {
      const replies = [
        "Based on the latest readings, things look stable. Heart rate and SpO₂ are within normal range.",
        "I'd keep an eye on her blood pressure today — it's trending slightly above her usual baseline.",
        "Her health score reflects an overall picture from the last 24 hours of vitals, lifestyle and adherence.",
      ];
      await new Promise((r) => setTimeout(r, 700));
      return { message: replies[Math.floor(Math.random() * replies.length)] };
    }
  },
};
