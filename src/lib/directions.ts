import { estimateWalkSeconds, haversineMeters, isValidCoord } from "@/lib/geo";
import type { RouteEstimate, TravelMode } from "@/lib/types";

type OsrmResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
};

function googleMapsDirUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode,
): string {
  const travelmode = mode === "walking" ? "walking" : mode === "driving" ? "driving" : "transit";
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=${travelmode}`;
}

function estimateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode,
): RouteEstimate {
  const distanceMeters = Math.round(haversineMeters(fromLat, fromLng, toLat, toLng));
  const durationSeconds =
    mode === "driving"
      ? Math.max(60, Math.round(distanceMeters / 8.3))
      : estimateWalkSeconds(distanceMeters);
  return {
    mode,
    distanceMeters,
    durationSeconds,
    geometry: [
      [fromLat, fromLng],
      [toLat, toLng],
    ],
    provider: "estimate",
    note:
      mode === "transit"
        ? "Transit geometry is opened in Google Maps. Straight-line distance is shown here as a fallback."
        : "Straight-line estimate only. Routing service was unavailable.",
  };
}

async function osrmRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode,
): Promise<RouteEstimate | null> {
  if (mode === "transit") return null;
  const profile = mode === "driving" ? "car" : "foot";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SmartMetroFinder/1.0 (transit helper)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as OsrmResponse;
    const route = data.routes?.[0];
    if (!route) return null;
    const geometry = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    return {
      mode,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry,
      provider: "osrm",
      note:
        mode === "walking"
          ? "Walking time is an estimate from the routing service, not a train arrival time."
          : "Driving time is an estimate from the routing service and does not include parking or traffic incidents.",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRouteEstimate(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode,
): Promise<{ route: RouteEstimate; mapsUrl: string }> {
  if (
    !isValidCoord(fromLat, fromLng) ||
    !isValidCoord(toLat, toLng)
  ) {
    throw new Error("Invalid coordinates");
  }

  const mapsUrl = googleMapsDirUrl(fromLat, fromLng, toLat, toLng, mode);
  if (mode === "transit") {
    const fallback = estimateRoute(fromLat, fromLng, toLat, toLng, mode);
    fallback.note =
      "Open Google Maps for official transit directions. This app does not invent train arrival times.";
    return { route: fallback, mapsUrl };
  }

  const routed = await osrmRoute(fromLat, fromLng, toLat, toLng, mode);
  return { route: routed ?? estimateRoute(fromLat, fromLng, toLat, toLng, mode), mapsUrl };
}

export { googleMapsDirUrl };
