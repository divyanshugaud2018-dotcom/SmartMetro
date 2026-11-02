"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/client";
import type { AppNotification, OfficialSourceRecord } from "@/lib/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sources, setSources] = useState<OfficialSourceRecord[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    const [notes, official] = await Promise.all([
      api<{ notifications: AppNotification[] }>("/api/notifications"),
      api<{ sources: OfficialSourceRecord[] }>("/api/official-sources"),
    ]);
    setNotifications(notes.notifications);
    setSources(official.sources);
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  const filteredSources = sources.filter((source) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${source.city} ${source.agency} ${source.region ?? ""}`.toLowerCase().includes(needle);
  });

  return (
    <AppShell>
      <div className="page-wrap">
        <header className="page-hero">
          <div>
            <p className="kicker">Notification center</p>
            <h1>Alerts &amp; official status</h1>
            <p className="muted">
              In-app history for proximity and reminder alerts. This product does not fabricate live delays, closures, or
              train arrival predictions.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/alerts-empty.jpg" alt="Quiet desk scene with a phone used for notifications" />
        </header>

        <div className="banner banner-info">
          Background geofencing is limited by the browser and OS. Alerts only fire while this tab is open and location
          tracking is enabled. For real service disruptions, use the official agency pages below.
        </div>

        <div className="toolbar">
          <h2>History</h2>
          <div className="toolbar-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void api("/api/notifications/read-all", { method: "POST" }).then(load)}
            >
              Mark all read
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => void api("/api/notifications/clear", { method: "POST" }).then(load)}
            >
              Clear history
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-panel">
            <p>No alerts yet. Enable tracking and a preferred station from Settings to receive proximity notices.</p>
          </div>
        ) : (
          <ul className="alert-list">
            {notifications.map((item) => (
              <li key={item.id} className={item.read ? "alert-item" : "alert-item is-unread"}>
                <div>
                  <p className="kicker">
                    {item.type} · {formatWhen(item.createdAt)}
                  </p>
                  <p className="station-name">{item.title}</p>
                  <p className="muted">{item.body}</p>
                </div>
                {!item.read ? (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      void api(`/api/notifications/${item.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ read: true }),
                      }).then(load)
                    }
                  >
                    Mark read
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => void api(`/api/notifications/${item.id}`, { method: "DELETE" }).then(load)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="toolbar" style={{ marginTop: "2rem" }}>
          <h2>Official metro sources</h2>
          <input
            className="inline-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by city or agency"
            aria-label="Filter official sources"
          />
        </div>
        <div className="source-grid">
          {filteredSources.map((source) => (
            <article key={source.id} className="source-card">
              <p className="kicker">
                {source.city}
                {source.region ? ` · ${source.region}` : ""}
              </p>
              <h3>{source.agency}</h3>
              <p className="muted">{source.notes}</p>
              <div className="saved-actions">
                <a className="secondary-btn" href={source.url} target="_blank" rel="noreferrer">
                  Official site
                </a>
                {source.statusUrl ? (
                  <a className="primary-btn" href={source.statusUrl} target="_blank" rel="noreferrer">
                    Service status
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
