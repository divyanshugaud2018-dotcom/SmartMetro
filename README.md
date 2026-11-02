# Smart Metro Finder

A production-ready Next.js app that locates nearby metro and rail stations, plots them on an interactive map, opens Google Maps directions, and stores per-device notification preferences in PostgreSQL.

## What it does

- Requests browser geolocation after explaining why, with manual search and map-pin fallbacks
- Finds nearby metro / light-rail / rail stations via Google Places API (New) when a server key is present, otherwise OpenStreetMap Overpass
- Shows distance, estimated walking time (routing estimate, never a train arrival), and station details
- Opens Google Maps for walking, driving, and transit directions
- Saves preferred stations, proximity alerts, and leave-time reminders
- Does **not** invent live arrivals, delays, or closures — official agency links live on the Alerts page

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL + Drizzle ORM
- Leaflet / Carto basemap (default)
- Optional Google Maps JavaScript API + Places API (New)
- OSRM for walking/driving geometry when available
- Web Notifications + a small service worker

## Environment

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# Optional
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

`GOOGLE_MAPS_API_KEY` is server-only (Places, Geocoding). `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is the Maps JavaScript browser key. Restrict both keys in Google Cloud Console.

Full setup steps are in the in-app **Setup & privacy** guide (`/guide`).

## GitHub and Vercel deployment

1. Import this repository in Vercel and connect the `main` branch.
2. Add `DATABASE_URL`, `GOOGLE_MAPS_API_KEY`, and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the Vercel project settings.
3. Create a hosted PostgreSQL database and run `npm run db:push` with its production URL.
4. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions repository secrets.
5. Every push to `main` runs type checking and a production build. A successful push then deploys to Vercel.

The workflow is [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Once changes are committed and pushed, GitHub verifies them and deploys successful `main` builds to Vercel.

## Scripts

```bash
npm run dev
npx drizzle-kit push
npm run build
```
