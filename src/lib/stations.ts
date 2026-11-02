import {
  clampRadiusMeters,
  haversineMeters,
  isValidCoord,
  roundCoord,
} from "@/lib/geo";
import type { MetroStation } from "@/lib/types";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type CacheEntry = { expires: number; stations: MetroStation[] };

const nearbyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function cacheKey(lat: number, lng: number, radius: number): string {
  return `${roundCoord(lat, 3)}:${roundCoord(lng, 3)}:${Math.round(radius)}`;
}

function tagsAddress(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] || tags["addr:neighbourhood"],
    tags["addr:city"] || tags["addr:town"],
  ].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return tags["addr:full"] || null;
}

function tagsLines(tags: Record<string, string> | undefined): string[] {
  if (!tags) return [];
  const raw = tags.line || tags.lines || tags.route || tags.ref || "";
  return raw
    .split(/[;,/|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function stationTypes(tags: Record<string, string> | undefined): string[] {
  if (!tags) return ["transit_station"];
  const types = new Set<string>();
  if (tags.station === "subway" || tags.subway === "yes" || tags.railway === "subway") {
    types.add("subway_station");
  }
  if (tags.station === "light_rail" || tags.light_rail === "yes") {
    types.add("light_rail_station");
  }
  if (tags.railway === "station" || tags.railway === "halt") {
    types.add("train_station");
  }
  if (tags.public_transport === "station") types.add("transit_station");
  if (!types.size) types.add("transit_station");
  return [...types];
}

function toStation(
  element: OverpassElement,
  originLat: number,
  originLng: number,
): MetroStation | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat == null || lng == null || !isValidCoord(lat, lng)) return null;
  const tags = element.tags ?? {};
  const name = tags.name || tags["name:en"] || tags.ref;
  if (!name) return null;

  return {
    id: `osm:${element.type}:${element.id}`,
    name,
    address: tagsAddress(tags),
    lat,
    lng,
    distanceMeters: Math.round(haversineMeters(originLat, originLng, lat, lng)),
    network: tags.network || null,
    operator: tags.operator || null,
    source: "openstreetmap",
    osmId: `${element.type}/${element.id}`,
    types: stationTypes(tags),
    wheelchair: tags.wheelchair || null,
    lines: tagsLines(tags),
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${name} ${lat},${lng}`,
    )}`,
  };
}

function dedupeStations(stations: MetroStation[]): MetroStation[] {
  const seen = new Map<string, MetroStation>();
  for (const station of stations) {
    const key = `${station.name.toLowerCase()}@${roundCoord(station.lat, 4)},${roundCoord(station.lng, 4)}`;
    const existing = seen.get(key);
    if (!existing || station.distanceMeters < existing.distanceMeters) {
      seen.set(key, station);
    }
  }
  return [...seen.values()].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

async function fetchOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "SmartMetroFinder/1.0 (transit helper)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const data = (await response.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass failed");
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Overpass unavailable");
}

async function fetchNominatimStations(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<MetroStation[]> {
  const latSpan = radiusMeters / 111000;
  const lngSpan = radiusMeters / (111000 * Math.max(Math.cos(lat * Math.PI / 180), 0.2));
  const viewbox = [
    lng - lngSpan,
    lat + latSpan,
    lng + lngSpan,
    lat - latSpan,
  ].join(",");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", "metro station");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "30");
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("bounded", "1");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SmartMetroFinder/1.0 (transit helper)",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return [];
    const places = await response.json() as {
      osm_type?: string;
      osm_id?: number;
      lat?: string;
      lon?: string;
      display_name?: string;
      name?: string;
      category?: string;
      type?: string;
    }[];
    return places.flatMap((place) => {
      const stationLat = Number(place.lat);
      const stationLng = Number(place.lon);
      const name = place.name?.trim();
      if (!name || !isValidCoord(stationLat, stationLng)) return [];
      const distanceMeters = Math.round(haversineMeters(lat, lng, stationLat, stationLng));
      if (distanceMeters > radiusMeters) return [];
      return [{
        id: `nominatim:${place.osm_type ?? "osm"}:${place.osm_id ?? `${stationLat},${stationLng}`}`,
        name,
        address: place.display_name ?? null,
        lat: stationLat,
        lng: stationLng,
        distanceMeters,
        network: null,
        operator: null,
        source: "openstreetmap" as const,
        osmId: place.osm_id ? `${place.osm_type ?? "osm"}/${place.osm_id}` : null,
        types: [place.type?.includes("subway") ? "subway_station" : "transit_station"],
        lines: [],
      }];
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${Math.round(radius)},${lat},${lng})`;
  return `
[out:json][timeout:18];
(
  node["station"="subway"]${around};
  way["station"="subway"]${around};
  node["station"="light_rail"]${around};
  way["station"="light_rail"]${around};
  node["railway"="subway_entrance"]["name"]${around};
  node["railway"="station"]["subway"="yes"]${around};
  node["public_transport"="station"]["subway"="yes"]${around};
  node["public_transport"="station"]["station"="subway"]${around};
  node["railway"="station"]${around};
  way["railway"="station"]${around};
  node["station"="train"]${around};
);
out center tags;
`.trim();
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  googleMapsUri?: string;
  primaryType?: string;
  accessibilityOptions?: { wheelchairAccessibleEntrance?: boolean };
};

async function fetchGoogleNearby(
  lat: number,
  lng: number,
  radius: number,
): Promise<MetroStation[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri,places.primaryType,places.accessibilityOptions",
      },
      body: JSON.stringify({
        includedTypes: [
          "subway_station",
          "light_rail_station",
          "train_station",
          "transit_station",
        ],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(radius, 50000),
          },
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Places ${response.status}`);
    }

    const data = (await response.json()) as { places?: GooglePlace[] };
    const stations: MetroStation[] = [];
    for (const place of data.places ?? []) {
      const plat = place.location?.latitude;
      const plng = place.location?.longitude;
      const name = place.displayName?.text;
      if (!name || plat == null || plng == null || !isValidCoord(plat, plng)) continue;
      stations.push({
        id: `google:${place.id ?? `${plat},${plng}`}`,
        name,
        address: place.formattedAddress ?? null,
        lat: plat,
        lng: plng,
        distanceMeters: Math.round(haversineMeters(lat, lng, plat, plng)),
        network: null,
        operator: null,
        source: "google",
        placeId: place.id ?? null,
        types: place.types?.length ? place.types : [place.primaryType || "transit_station"],
        googleMapsUri: place.googleMapsUri ?? null,
        wheelchair:
          place.accessibilityOptions?.wheelchairAccessibleEntrance == null
            ? null
            : place.accessibilityOptions.wheelchairAccessibleEntrance
              ? "yes"
              : "no",
        lines: [],
      });
    }
    return stations;
  } finally {
    clearTimeout(timeout);
  }
}

export async function findNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<{ stations: MetroStation[]; provider: "google" | "openstreetmap" | "hybrid"; warning?: string }> {
  if (!isValidCoord(lat, lng)) {
    throw new Error("Invalid coordinates");
  }
  const radius = clampRadiusMeters(radiusMeters);
  const key = cacheKey(lat, lng, radius);
  const cached = nearbyCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return {
      stations: cached.stations.map((station) => ({
        ...station,
        distanceMeters: Math.round(haversineMeters(lat, lng, station.lat, station.lng)),
      })),
      provider: process.env.GOOGLE_MAPS_API_KEY ? "hybrid" : "openstreetmap",
    };
  }

  let googleStations: MetroStation[] = [];
  let osmStations: MetroStation[] = [];
  let warning: string | undefined;
  let googleOk = false;
  let osmOk = false;

  const googleLookup = process.env.GOOGLE_MAPS_API_KEY
    ? fetchGoogleNearby(lat, lng, radius)
        .then((stations) => {
          googleStations = stations;
          googleOk = true;
        })
        .catch(() => {
          warning = "Google Places was unavailable, so OpenStreetMap results are shown instead.";
        })
    : Promise.resolve();

  const osmLookup = fetchOverpass(buildOverpassQuery(lat, lng, radius))
    .then((elements) => {
      osmStations = elements
        .map((element) => toStation(element, lat, lng))
        .filter((station): station is MetroStation => Boolean(station));
      osmOk = true;
    })
    .catch(() => {
      warning =
        warning ??
        "OpenStreetMap lookup failed; showing Google Places results only.";
    });

  const fallbackLookup = fetchNominatimStations(
    lat,
    lng,
    radius,
  );
  const providerLookup = Promise.all([googleLookup, osmLookup]);
  const firstResult = await Promise.race([
    providerLookup.then(() => null),
    fallbackLookup,
  ]);
  const initialFallback = Array.isArray(firstResult) ? firstResult : await fallbackLookup;
  let fallbackStations = initialFallback;

  if (!googleOk && !osmOk) {
    if (fallbackStations.length === 0) {
      throw new Error("Nearby station lookup is temporarily unavailable.");
    }
  }

  let merged = dedupeStations([...googleStations, ...osmStations, ...fallbackStations]).filter(
    (station) => station.distanceMeters <= radius + 25,
  );

  // Providers can be unavailable or return sparse local coverage. Keep the
  // nearest usable stations by repeating the fallback lookup up to 50 km.
  if (merged.length === 0 && fallbackStations.length === 0) {
    fallbackStations = await fetchNominatimStations(lat, lng, radius);
    merged = dedupeStations([...googleStations, ...osmStations, ...fallbackStations]);
  }

  nearbyCache.set(key, { expires: Date.now() + CACHE_TTL_MS, stations: merged });

  const provider: "google" | "openstreetmap" | "hybrid" =
    googleOk && osmOk ? "hybrid" : googleOk ? "google" : "openstreetmap";

  return { stations: merged, provider, warning };
}

export async function searchStationsByText(
  query: string,
  lat?: number,
  lng?: number,
): Promise<MetroStation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const body: Record<string, unknown> = {
        textQuery: `${trimmed} metro station`,
        pageSize: 12,
        includedType: "subway_station",
      };
      if (lat != null && lng != null && isValidCoord(lat, lng)) {
        body.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 15000,
          },
        };
      }
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as { places?: GooglePlace[] };
        const originLat = lat ?? data.places?.[0]?.location?.latitude ?? 0;
        const originLng = lng ?? data.places?.[0]?.location?.longitude ?? 0;
        return (data.places ?? [])
          .map((place) => {
            const plat = place.location?.latitude;
            const plng = place.location?.longitude;
            const name = place.displayName?.text;
            if (!name || plat == null || plng == null) return null;
            const station: MetroStation = {
              id: `google:${place.id ?? `${plat},${plng}`}`,
              name,
              address: place.formattedAddress ?? null,
              lat: plat,
              lng: plng,
              distanceMeters: Math.round(haversineMeters(originLat, originLng, plat, plng)),
              network: null,
              operator: null,
              source: "google",
              placeId: place.id ?? null,
              types: place.types ?? ["subway_station"],
              googleMapsUri: place.googleMapsUri ?? null,
              wheelchair: null,
              lines: [],
            };
            return station;
          })
          .filter((station): station is MetroStation => Boolean(station));
      }
    } catch {
      // Fall through to Nominatim-backed search in the route handler.
    }
  }
  return [];
}
