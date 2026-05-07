const API_BASE = "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  listPatients: () => request<any[]>("/patients"),
  getPatient: (id: string) => request<any>(`/patients/${id}`),
  getVitals: (id: string) => request<any[]>(`/patients/${id}/vitals`),
  getHealthScore: (id: string) => request<any>(`/patients/${id}/health-score`),
  getAlerts: (id: string) => request<any[]>(`/patients/${id}/alerts`),
  acknowledgeAlert: (id: string) =>
    request<any>(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
  getLocation: (id: string) => request<any>(`/patients/${id}/location`),
  chat: (message: string, patientId?: string) =>
    request<any>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, patient_id: patientId }),
    }),
};