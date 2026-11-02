import Link from "next/link";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Setup & privacy · Smart Metro Finder",
};

export default function GuidePage() {
  return (
    <AppShell>
      <div className="page-wrap prose-page">
        <header className="page-hero">
          <div>
            <p className="kicker">Operators</p>
            <h1>Google Maps setup, privacy, and reliability</h1>
            <p className="muted">
              The finder works with OpenStreetMap data out of the box. Add Google Maps Platform keys when you want Places
              (New), Geocoding, and the JavaScript map.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-metro.jpg" alt="Cinematic view of a contemporary metro platform" />
        </header>

        <section className="settings-card">
          <h2>1. Create a Google Cloud project</h2>
          <ol>
            <li>
              Open{" "}
              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                Google Cloud Console
              </a>{" "}
              and create or select a project.
            </li>
            <li>Link a billing account. Maps Platform products are billed with a monthly credit; set budgets and alerts.</li>
          </ol>
        </section>

        <section className="settings-card">
          <h2>2. Enable APIs</h2>
          <p>Enable only what you need:</p>
          <ul>
            <li>Maps JavaScript API — interactive Google map in the browser</li>
            <li>Places API (New) — nearby metro / transit search</li>
            <li>Geocoding API — reverse and forward addresses</li>
            <li>Routes API or Directions API — optional server-side travel times</li>
          </ul>
        </section>

        <section className="settings-card">
          <h2>3. Create restricted keys</h2>
          <p>Never ship an unrestricted key. Create two keys:</p>
          <ol>
            <li>
              <strong>Browser key</strong> for <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>. Application restriction:
              HTTP referrers (your production domain and <code>http://localhost:3000/*</code>). API restriction: Maps
              JavaScript API only.
            </li>
            <li>
              <strong>Server key</strong> for <code>GOOGLE_MAPS_API_KEY</code>. Application restriction: IP addresses of
              your server if possible. API restriction: Places API (New), Geocoding API, Routes API. This key is read
              only in Route Handlers and never sent to the browser.
            </li>
          </ol>
        </section>

        <section className="settings-card">
          <h2>4. Environment variables</h2>
          <p>Local <code>.env</code> (never commit real secrets):</p>
          <pre>{`DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
GOOGLE_MAPS_API_KEY=your_server_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key`}</pre>
          <p>
            On Vercel or similar, add the same names in project settings. <code>NEXT_PUBLIC_*</code> values are inlined
            at build time, so rebuild after rotating a browser key.
          </p>
        </section>

        <section className="settings-card">
          <h2>5. Deploy and verify</h2>
          <ol>
            <li>Deploy over HTTPS so geolocation and notifications are allowed.</li>
            <li>Confirm <code>/api/health</code> returns <code>{`{ ok: true }`}</code>.</li>
            <li>
              Open Settings. If keys loaded, the config line reports Google client/server as yes. Nearby search then
              prefers Places (New) and falls back to OpenStreetMap if Google errors or billing is blocked.
            </li>
            <li>Watch Cloud Console quotas. Set daily caps so a leaked referrer cannot run unbounded queries.</li>
          </ol>
        </section>

        <section className="settings-card">
          <h2>What this app will not do</h2>
          <ul>
            <li>It will not invent live train arrival times or disruption alerts.</li>
            <li>It will not treat walking distance as proof that a train is arriving.</li>
            <li>
              It cannot guarantee background geofencing. Safari, iOS, and many Android browsers pause JavaScript when the
              tab is not visible.
            </li>
          </ul>
          <p>
            Use the <Link href="/alerts">alerts page</Link> for official agency status links, and Settings to stop
            tracking immediately.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
