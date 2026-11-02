"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { IconStar, IconTrash } from "@/components/Icons";
import { api } from "@/lib/client";
import { googleMapsSearchUrl } from "@/lib/map-links";
import type { SavedStationRecord } from "@/lib/types";

export default function SavedPage() {
  const router = useRouter();
  const [stations, setStations] = useState<SavedStationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ stations: SavedStationRecord[] }>("/api/saved-stations");
      setStations(data.stations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved stations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setPreferred(id: string) {
    await api(`/api/saved-stations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPreferred: true }),
    });
    await load();
  }

  async function remove(id: string) {
    await api(`/api/saved-stations/${id}`, { method: "DELETE" });
    await load();
  }

  function openOnMap(station: SavedStationRecord) {
    sessionStorage.setItem(
      "smf-focus-station",
      JSON.stringify({ lat: station.lat, lng: station.lng, address: station.address, source: "search" }),
    );
    router.push("/");
  }

  return (
    <AppShell>
      <div className="page-wrap">
        <header className="page-hero">
          <div>
            <p className="kicker">Library</p>
            <h1>Saved stations</h1>
            <p className="muted">
              Pin a preferred station for proximity alerts and leave-time reminders. Precise GPS tracks are never stored.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/station-tokyo.jpg" alt="Commuters waiting at a metro platform" />
        </header>

        {error ? <p className="banner banner-warn">{error}</p> : null}
        {loading ? <p className="muted">Loading saved stations…</p> : null}
        {!loading && stations.length === 0 ? (
          <div className="empty-panel">
            <p>No saved stations yet. Open the map, select a stop, and tap Save station.</p>
            <Link href="/" className="primary-btn">
              Find stations
            </Link>
          </div>
        ) : null}

        <ul className="saved-list">
          {stations.map((station) => (
            <li key={station.id} className={station.isPreferred ? "saved-item is-preferred" : "saved-item"}>
              <div>
                <p className="station-name">
                  {station.name}{" "}
                  {station.isPreferred ? (
                    <span className="chip chip-accent">
                      <IconStar className="h-3 w-3" /> Preferred
                    </span>
                  ) : null}
                </p>
                <p className="muted">{station.address || `${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`}</p>
                {station.network ? <p className="fine-print">{station.network}</p> : null}
              </div>
              <div className="saved-actions">
                <button type="button" className="secondary-btn" onClick={() => openOnMap(station)}>
                  Show on map
                </button>
                <a
                  className="secondary-btn"
                  href={googleMapsSearchUrl(station.lat, station.lng, station.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Maps
                </a>
                {!station.isPreferred ? (
                  <button type="button" className="secondary-btn" onClick={() => void setPreferred(station.id)}>
                    Make preferred
                  </button>
                ) : null}
                <button type="button" className="text-btn" onClick={() => void remove(station.id)}>
                  <IconTrash className="h-4 w-4" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
