"use client";

import { useEffect, useRef } from "react";
import type { MetroStation, UserLocation } from "@/lib/types";

type Props = {
  user: UserLocation | null;
  stations: MetroStation[];
  selectedId: string | null;
  route: [number, number][];
  dark: boolean;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  onUnavailable?: (message: string) => void;
};

type GoogleNs = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
    Marker: new (opts: Record<string, unknown>) => GoogleMarker;
    Polyline: new (opts: Record<string, unknown>) => GooglePolyline;
    LatLngBounds: new () => { extend: (x: { lat: number; lng: number }) => void };
    SymbolPath: { CIRCLE: unknown };
    event: { addListener: (target: unknown, name: string, handler: (e: { latLng?: { lat: () => number; lng: () => number } }) => void) => void };
  };
};

type GoogleMap = {
  setCenter: (x: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
  panTo: (x: { lat: number; lng: number }) => void;
  fitBounds: (b: { extend: (x: { lat: number; lng: number }) => void }, padding?: number) => void;
};

type GoogleMarker = {
  setMap: (map: GoogleMap | null) => void;
  setPosition: (x: { lat: number; lng: number }) => void;
  addListener: (name: string, handler: () => void) => void;
};

type GooglePolyline = {
  setMap: (map: GoogleMap | null) => void;
};

declare global {
  interface Window {
    google?: GoogleNs;
    gm_authFailure?: () => void;
  }
}

function loadGoogle(key: string): Promise<GoogleNs> {
  if (window.google?.maps) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-smf-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google) resolve(window.google);
        else reject(new Error("Google Maps failed to load"));
      });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.async = true;
    script.dataset.smfGmaps = "true";
    script.onload = () => {
      if (window.google) resolve(window.google);
      else reject(new Error("Google Maps failed to load"));
    };
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

export default function GoogleMapCanvas({
  user,
  stations,
  selectedId,
  route,
  dark,
  onSelect,
  onMapClick,
  onUnavailable,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const userMarkerRef = useRef<GoogleMarker | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const lineRef = useRef<GooglePolyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const onClickRef = useRef(onMapClick);
  const googleRef = useRef<GoogleNs | null>(null);
  const didCenter = useRef(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || !containerRef.current) {
      if (!key) {
        onUnavailable?.("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
      }
      return;
    }
    let cancelled = false;
    window.gm_authFailure = () => {
      if (!cancelled) {
        onUnavailable?.(
          "Google Maps authentication failed. Enable Maps JavaScript API and check the browser key restrictions.",
        );
      }
    };
    loadGoogle(key)
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        googleRef.current = g;
        const map = new g.maps.Map(containerRef.current, {
          center: user ? { lat: user.lat, lng: user.lng } : { lat: 40.758, lng: -73.9855 },
          zoom: user ? 14 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: dark
            ? [
                { elementType: "geometry", stylers: [{ color: "#0e1c30" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#93a4b8" }] },
                { featureType: "water", stylers: [{ color: "#07111f" }] },
                { featureType: "poi", stylers: [{ visibility: "off" }] },
                { featureType: "transit.station", stylers: [{ visibility: "on" }] },
              ]
            : [
                { featureType: "poi", stylers: [{ visibility: "off" }] },
                { featureType: "transit.station", stylers: [{ visibility: "on" }] },
              ],
        });
        mapRef.current = map;
        g.maps.event.addListener(map, "click", (event) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();
          if (lat != null && lng != null) onClickRef.current(lat, lng);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onUnavailable?.(
            error instanceof Error
              ? error.message
              : "Google Maps could not load with the configured browser API key.",
          );
        }
      });
    return () => {
      cancelled = true;
      if (window.gm_authFailure) delete window.gm_authFailure;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = googleRef.current;
    const map = mapRef.current;
    if (!g || !map || !user) return;
    const position = { lat: user.lat, lng: user.lng };
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
    } else {
      userMarkerRef.current = new g.maps.Marker({
        map,
        position,
        title: "You are here",
        zIndex: 999,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
    }
    if (!didCenter.current) {
      map.setCenter(position);
      map.setZoom(14);
      didCenter.current = true;
    }
  }, [user]);

  useEffect(() => {
    const g = googleRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = stations.map((station) => {
      const selected = station.id === selectedId;
      const marker = new g.maps.Marker({
        map,
        position: { lat: station.lat, lng: station.lng },
        title: station.name,
        zIndex: selected ? 500 : 200,
        label: {
          text: (station.name[0] || "M").toUpperCase(),
          color: "#fff",
          fontSize: "11px",
          fontWeight: "700",
        },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: selected ? 14 : 10,
          fillColor: selected ? "#0f766e" : "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => onSelectRef.current(station.id));
      return marker;
    });
  }, [stations, selectedId]);

  useEffect(() => {
    const g = googleRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    lineRef.current?.setMap(null);
    if (route.length > 1) {
      lineRef.current = new g.maps.Polyline({
        map,
        path: route.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: dark ? "#5eead4" : "#0f766e",
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      const bounds = new g.maps.LatLngBounds();
      for (const [lat, lng] of route) bounds.extend({ lat, lng });
      map.fitBounds(bounds, 48);
    }
  }, [route, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = stations.find((station) => station.id === selectedId);
    if (selected) map.panTo({ lat: selected.lat, lng: selected.lng });
  }, [selectedId, stations]);

  return <div ref={containerRef} className="map-canvas" role="application" aria-label="Google Map of metro stations" />;
}
