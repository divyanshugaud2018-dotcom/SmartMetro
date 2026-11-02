import type { TravelMode } from "@/lib/types";

export function googleMapsSearchUrl(lat: number, lng: number, name?: string | null): string {
  const query = name ? `${name} ${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsDirUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TravelMode,
): string {
  const travelmode = mode === "walking" ? "walking" : mode === "driving" ? "driving" : "transit";
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=${travelmode}`;
}

export function googleMapsPlaceUrl(uri: string | null | undefined, lat: number, lng: number, name?: string | null): string {
  return uri || googleMapsSearchUrl(lat, lng, name);
}
