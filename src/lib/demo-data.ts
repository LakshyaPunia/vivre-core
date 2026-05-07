export const DEMO_PATIENTS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Ruth Thomas",
    age: 76,
    city: "Chicago",
    health_score: 78,
    predicted_condition: "Stable hypertension",
    updated_at: new Date().toISOString(),
    emergency_contact: { name: "Sarah Thomas", phone: "+1 312 555 0143" },
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Harold Wilson",
    age: 82,
    city: "Houston",
    health_score: 36,
    predicted_condition: "Cardiac arrhythmia risk",
    updated_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    active_alert: "Low SpO₂",
    emergency_contact: { name: "Mike Wilson", phone: "+1 713 555 0192" },
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Dorothy Clark",
    age: 69,
    city: "San Francisco",
    health_score: 94,
    predicted_condition: "Excellent health",
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    emergency_contact: { name: "Emma Clark", phone: "+1 415 555 0188" },
  },
];

const trend = (base: number, n = 24, jitter = 4) =>
  Array.from({ length: n }, (_, i) => base + Math.sin(i / 3) * jitter + (Math.random() - 0.5) * jitter);

export const DEMO_VITALS: Record<string, any[]> = {
  "00000000-0000-0000-0000-000000000001": [
    { metric: "heart_rate", value: 78, unit: "bpm", status: "ok", trend: 2.1, history: trend(78) },
    { metric: "spo2", value: 97, unit: "%", status: "ok", trend: 0.0, history: trend(97, 24, 1) },
    { metric: "blood_pressure", value: 128, unit: "mmHg", status: "warn", trend: 4.5, history: trend(128, 24, 6) },
    { metric: "temperature", value: 36.7, unit: "°C", status: "ok", trend: -0.3, history: trend(36.7, 24, 0.4) },
    { metric: "glucose", value: 110, unit: "mg/dL", status: "ok", trend: -1.2, history: trend(110, 24, 8) },
    { metric: "respiratory_rate", value: 16, unit: "/min", status: "ok", trend: 0.5, history: trend(16, 24, 2) },
  ],
  "00000000-0000-0000-0000-000000000002": [
    { metric: "heart_rate", value: 102, unit: "bpm", status: "warn", trend: 8.4, history: trend(102, 24, 12) },
    { metric: "spo2", value: 89, unit: "%", status: "crit", trend: -3.1, history: trend(89, 24, 3) },
    { metric: "blood_pressure", value: 156, unit: "mmHg", status: "crit", trend: 6.2, history: trend(156, 24, 8) },
    { metric: "temperature", value: 37.4, unit: "°C", status: "warn", trend: 1.1, history: trend(37.4, 24, 0.4) },
    { metric: "glucose", value: 142, unit: "mg/dL", status: "warn", trend: 4.0, history: trend(142, 24, 10) },
    { metric: "respiratory_rate", value: 22, unit: "/min", status: "warn", trend: 6.0, history: trend(22, 24, 3) },
  ],
  "00000000-0000-0000-0000-000000000003": [
    { metric: "heart_rate", value: 68, unit: "bpm", status: "ok", trend: -1.0, history: trend(68) },
    { metric: "spo2", value: 99, unit: "%", status: "ok", trend: 0.2, history: trend(99, 24, 1) },
    { metric: "blood_pressure", value: 118, unit: "mmHg", status: "ok", trend: -2.0, history: trend(118) },
    { metric: "temperature", value: 36.5, unit: "°C", status: "ok", trend: 0.1, history: trend(36.5, 24, 0.3) },
    { metric: "glucose", value: 95, unit: "mg/dL", status: "ok", trend: -0.5, history: trend(95) },
    { metric: "respiratory_rate", value: 14, unit: "/min", status: "ok", trend: 0.0, history: trend(14) },
  ],
};

export const DEMO_ALERTS: Record<string, any[]> = {
  "00000000-0000-0000-0000-000000000002": [
    { id: "a1", patient_id: "00000000-0000-0000-0000-000000000002", severity: "critical", message: "SpO₂ dropped to 89% — possible respiratory event", created_at: new Date(Date.now() - 60000 * 3).toISOString(), acknowledged: false },
    { id: "a2", patient_id: "00000000-0000-0000-0000-000000000002", severity: "warning", message: "Blood pressure trending high (156/96)", created_at: new Date(Date.now() - 60000 * 27).toISOString(), acknowledged: false },
    { id: "a3", patient_id: "00000000-0000-0000-0000-000000000002", severity: "warning", message: "Missed evening medication", created_at: new Date(Date.now() - 60000 * 240).toISOString(), acknowledged: true },
  ],
  "00000000-0000-0000-0000-000000000001": [
    { id: "a4", patient_id: "00000000-0000-0000-0000-000000000001", severity: "warning", message: "BP slightly elevated this afternoon", created_at: new Date(Date.now() - 60000 * 90).toISOString(), acknowledged: false },
  ],
  "00000000-0000-0000-0000-000000000003": [],
};

export const DEMO_HEALTH_TREND = (base: number) =>
  Array.from({ length: 24 }, (_, i) => ({
    t: `${String(i).padStart(2, "0")}:00`,
    score: Math.round(base + Math.sin(i / 3.2) * 6 + (Math.random() - 0.5) * 4),
  }));

export const DEMO_LIFESTYLE = (id: string) => {
  const map: Record<string, number[]> = {
    "00000000-0000-0000-0000-000000000001": [78, 42, 65, 70, 88],
    "00000000-0000-0000-0000-000000000002": [54, 78, 32, 45, 60],
    "00000000-0000-0000-0000-000000000003": [92, 22, 88, 90, 96],
  };
  const [sleep, stress, activity, hydration, meds] = map[id] ?? [70, 40, 60, 70, 80];
  return [
    { label: "Sleep quality", value: sleep },
    { label: "Stress level", value: stress, invert: true },
    { label: "Activity score", value: activity },
    { label: "Hydration", value: hydration },
    { label: "Medication adherence", value: meds },
  ];
};
