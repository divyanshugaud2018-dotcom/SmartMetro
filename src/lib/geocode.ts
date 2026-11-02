import { isValidCoord } from "@/lib/geo";
import type { GeocodeHit } from "@/lib/types";

const USER_AGENT = "SmartMetroFinder/1.0 (transit helper)";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  name?: string;
  address?: Record<string, string>;
};

const reverseCache = new Map<string, { expires: number; address: string }>();

function formatNominatimAddress(result: NominatimResult): string {
  const address = result.address ?? {};
  const parts = [
    address.road ? `${address.house_number ? `${address.house_number} ` : ""}${address.road}` : null,
    address.neighbourhood || address.suburb,
    address.city || address.town || address.village,
    address.state,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : result.display_name;
}

async function googleReverse(lat: number, lng: number): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status: string;
    results?: { formatted_address?: string }[];
  };
  if (data.status !== "OK") return null;
  return data.results?.[0]?.formatted_address ?? null;
}

async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimResult;
  return formatNominatimAddress(data);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!isValidCoord(lat, lng)) return null;
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = reverseCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.address;

  let address: string | null = null;
  try {
    address = await googleReverse(lat, lng);
  } catch {
    address = null;
  }
  if (!address) {
    try {
      address = await nominatimReverse(lat, lng);
    } catch {
      address = null;
    }
  }
  if (address) {
    reverseCache.set(key, { expires: Date.now() + 10 * 60 * 1000, address });
  }
  return address;
}

async function googleTextSearch(
  query: string,
  lat?: number,
  lng?: number,
): Promise<GeocodeHit[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  if (lat != null && lng != null) {
    url.searchParams.set("bounds", `${lat - 0.2},${lng - 0.2}|${lat + 0.2},${lng + 0.2}`);
  }
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    status: string;
    results?: {
      place_id: string;
      formatted_address: string;
      geometry?: { location?: { lat: number; lng: number } };
      types?: string[];
    }[];
  };
  if (data.status !== "OK") return [];
  return (data.results ?? []).slice(0, 8).map((result) => ({
    id: `google:${result.place_id}`,
    label: result.formatted_address.split(",")[0] ?? result.formatted_address,
    address: result.formatted_address,
    lat: result.geometry?.location?.lat ?? 0,
    lng: result.geometry?.location?.lng ?? 0,
    type: result.types?.[0] ?? "geocode",
  }));
}

async function nominatimSearch(
  query: string,
  lat?: number,
  lng?: number,
): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  if (lat != null && lng != null && isValidCoord(lat, lng)) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = (await response.json()) as NominatimResult[];
  return data
    .map((result) => ({
      id: `osm:${result.place_id}`,
      label: result.name || result.display_name.split(",")[0],
      address: formatNominatimAddress(result),
      lat: Number(result.lat),
      lng: Number(result.lon),
      type: result.type || result.class || "place",
    }))
    .filter((hit) => isValidCoord(hit.lat, hit.lng));
}

export async function searchPlaces(
  query: string,
  lat?: number,
  lng?: number,
): Promise<GeocodeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const googleHits = await googleTextSearch(trimmed, lat, lng);
    if (googleHits.length) return googleHits;
  } catch {
    // Continue with Nominatim.
  }
  return nominatimSearch(trimmed, lat, lng);
}
