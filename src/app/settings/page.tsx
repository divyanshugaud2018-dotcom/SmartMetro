"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, showBrowserNotification } from "@/lib/client";
import { applyTheme } from "@/lib/theme";
import type { AppPreferences, MapConfig } from "@/lib/types";

const DEFAULT_PREFS: AppPreferences = {
  proximityAlerts: true,
  preferredStationReminders: true,
  serviceAlerts: false,
  browserNotifications: false,
  trackingEnabled: false,
  proximityRadiusMeters: 400,
  reminderHour: 8,
  reminderMinute: 0,
  reminderDays: "1,2,3,4,5",
  theme: "system",
  mapProvider: "auto",
};

const DAYS = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

const VOICE_LANGUAGES = [
  ["en", "English"],
  ["hi", "Hindi / हिन्दी"],
  ["bn", "Bengali / বাংলা"],
  ["mr", "Marathi / मराठी"],
  ["ta", "Tamil / தமிழ்"],
  ["te", "Telugu / తెలుగు"],
  ["kn", "Kannada / ಕನ್ನಡ"],
  ["ml", "Malayalam / മലയാളം"],
  ["gu", "Gujarati / ગુજરાતી"],
  ["pa", "Punjabi / ਪੰਜਾਬੀ"],
] as const;

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFS);
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("default");
  const [voiceLanguage, setVoiceLanguage] = useState("en");

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    setVoiceLanguage(localStorage.getItem("smf-voice-language") || "en");
    void api<{ preferences: AppPreferences }>("/api/preferences")
      .then((data) => setPrefs(data.preferences))
      .catch(() => undefined);
    void api<MapConfig>("/api/config")
      .then(setConfig)
      .catch(() => undefined);
  }, []);

  async function save(next: AppPreferences) {
    setPrefs(next);
    applyTheme(next.theme);
    const data = await api<{ preferences: AppPreferences }>("/api/preferences", {
      method: "PUT",
      body: JSON.stringify(next),
    });
    setPrefs(data.preferences);
    setStatus("Preferences saved on this device.");
  }

  async function enableBrowserNotes() {
    if (!("Notification" in window)) {
      setStatus("This browser does not support notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      showBrowserNotification("Metro alerts enabled", "You will only receive alerts you turned on.");
      await save({ ...prefs, browserNotifications: true });
    } else {
      await save({ ...prefs, browserNotifications: false });
    }
  }

  function toggleDay(day: string) {
    const current = new Set(prefs.reminderDays.split(",").filter(Boolean));
    if (current.has(day)) current.delete(day);
    else current.add(day);
    void save({ ...prefs, reminderDays: [...current].sort().join(",") });
  }

  return (
    <AppShell>
      <div className="page-wrap">
        <header className="page-hero">
          <div>
            <p className="kicker">Controls</p>
            <h1>Notification &amp; privacy settings</h1>
            <p className="muted">
              Every switch is stored per device, not as a public profile. Location tracking is off unless you turn it on.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/station-hamburg.jpg" alt="Quiet modern metro station hall" />
        </header>

        {status ? <p className="banner banner-info">{status}</p> : null}

        <section className="settings-card">
          <h2>Location</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.trackingEnabled}
              onChange={(event) => void save({ ...prefs, trackingEnabled: event.target.checked })}
            />
            <span>
              Enable live location tracking
              <small>Uses watchPosition while this tab is open. Stop anytime. No location history is saved.</small>
            </span>
          </label>
          <label className="slider-field">
            Proximity radius: {prefs.proximityRadiusMeters} m
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={prefs.proximityRadiusMeters}
              onChange={(event) =>
                void save({ ...prefs, proximityRadiusMeters: Number(event.target.value) })
              }
            />
          </label>
        </section>

        <section className="settings-card">
          <h2>Alert types</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.proximityAlerts}
              onChange={(event) => void save({ ...prefs, proximityAlerts: event.target.checked })}
            />
            <span>
              Nearby station alerts
              <small>Fires at most once per hour per station when you are inside the radius.</small>
            </span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.preferredStationReminders}
              onChange={(event) => void save({ ...prefs, preferredStationReminders: event.target.checked })}
            />
            <span>
              Preferred station reminders
              <small>Local time reminder to leave. Not a predicted train arrival.</small>
            </span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.serviceAlerts}
              onChange={(event) => void save({ ...prefs, serviceAlerts: event.target.checked })}
            />
            <span>
              Service disruption notices
              <small>No live feed is connected. Enabling this only reminds you to check official sources.</small>
            </span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.browserNotifications && permission === "granted"}
              onChange={(event) => {
                if (event.target.checked) void enableBrowserNotes();
                else void save({ ...prefs, browserNotifications: false });
              }}
            />
            <span>
              Browser notifications
              <small>Permission: {permission}. Background delivery is not guaranteed on iOS or locked screens.</small>
            </span>
          </label>
        </section>

        <section className="settings-card">
          <h2>Leave reminder</h2>
          <div className="time-row">
            <label>
              Hour
              <input
                type="number"
                min={0}
                max={23}
                value={prefs.reminderHour ?? 8}
                onChange={(event) => void save({ ...prefs, reminderHour: Number(event.target.value) })}
              />
            </label>
            <label>
              Minute
              <input
                type="number"
                min={0}
                max={59}
                value={prefs.reminderMinute ?? 0}
                onChange={(event) => void save({ ...prefs, reminderMinute: Number(event.target.value) })}
              />
            </label>
          </div>
          <div className="day-row">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={prefs.reminderDays.split(",").includes(day.value) ? "day is-active" : "day"}
                onClick={() => toggleDay(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <h2>Display</h2>
          <div className="segmented">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={prefs.theme === theme ? "is-active" : ""}
                onClick={() => void save({ ...prefs, theme })}
              >
                {theme}
              </button>
            ))}
          </div>
          <h3 className="subhead">Voice guidance language</h3>
          <select
            className="inline-search"
            value={voiceLanguage}
            onChange={(event) => {
              const language = event.target.value;
              setVoiceLanguage(language);
              localStorage.setItem("smf-voice-language", language);
              setStatus("Voice guidance language saved on this device.");
            }}
            aria-label="Voice guidance language"
          >
            {VOICE_LANGUAGES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <h3 className="subhead">Map provider</h3>
          <div className="segmented">
            {(["auto", "osm", "google"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                className={prefs.mapProvider === provider ? "is-active" : ""}
                onClick={() => void save({ ...prefs, mapProvider: provider })}
              >
                {provider === "osm" ? "OpenStreetMap" : provider === "google" ? "Google Maps" : "Auto"}
              </button>
            ))}
          </div>
          <p className="fine-print">
            Google Maps tiles require <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Client key configured:{" "}
            {config?.googleMapsClient ? "yes" : "no"}. Server Places key configured: {config?.googleMapsServer ? "yes" : "no"}.
          </p>
        </section>

        <section className="settings-card">
          <h2>Privacy</h2>
          <ul className="welcome-list">
            <li>Location is requested only after the welcome explanation, or when you tap Locate me.</li>
            <li>This app does not keep a breadcrumb trail of GPS points in the database.</li>
            <li>Saved stations and alert history are keyed to a random device id in local storage.</li>
            <li>
              HTTPS is required in production for geolocation and notifications. See the{" "}
              <Link href="/guide">setup guide</Link>.
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
