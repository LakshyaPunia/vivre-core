import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/patients_/$patientId/location")({
  head: () => ({ meta: [{ title: "Location — Vivre" }] }),
  component: LocationPage,
});

function LocationPage() {
  const { patientId } = Route.useParams();
  const [loc, setLoc] = useState<any>(null);

  useEffect(() => {
    api.getLocation(patientId).then(setLoc).catch(() => {});
  }, [patientId]);

  return (
    <div>
      <Link to="/patients/$patientId" params={{ patientId }}>← Back</Link>
      <h1>Location</h1>
      {loc ? (
        <>
          <p>Lat: {loc.lat}, Lng: {loc.lng}</p>
          <p>Updated: {loc.updated_at}</p>
          <p>Geofence: {loc.in_safe_zone ? "Within safe zone" : "Outside safe zone"}</p>
        </>
      ) : (
        <p>Loading location…</p>
      )}
      <div data-map-placeholder>Map embed goes here</div>
    </div>
  );
}