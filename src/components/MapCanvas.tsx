"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MetroStation, UserLocation } from "@/lib/types";

type Props = {
  user: UserLocation | null;
  stations: MetroStation[];
  selectedId: string | null;
  route: [number, number][];
  dark: boolean;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
};

const LIGHT_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function userIcon(): L.DivIcon {
  return L.divIcon({
    className: "smf-divicon",
    html: `<div class="smf-user-marker" title="You are here"><span class="smf-user-pulse"></span><span class="smf-user-dot"></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function stationIcon(name: string, selected: boolean): L.DivIcon {
  const letter = (name.trim()[0] || "M").toUpperCase();
  return L.divIcon({
    className: "smf-divicon",
    html: `<div class="smf-station-marker${selected ? " is-selected" : ""}">${letter}</div>`,
    iconSize: selected ? [40, 40] : [30, 30],
    iconAnchor: selected ? [20, 20] : [15, 15],
  });
}

export default function MapCanvas({
  user,
  stations,
  selectedId,
  route,
  dark,
  onSelect,
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const userRef = useRef<L.Marker | null>(null);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const onSelectRef = useRef(onSelect);
  const onClickRef = useRef(onMapClick);
  const didFitRef = useRef(false);

  onSelectRef.current = onSelect;
  onClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 3,
      maxZoom: 19,
    }).setView(user ? [user.lat, user.lng] : [40.758, -73.9855], user ? 14 : 12);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    const tiles = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
      attribution: ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    tilesRef.current = tiles;
    stationLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onClickRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tilesRef.current = null;
      userRef.current = null;
      stationLayerRef.current = null;
      routeRef.current = null;
      didFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tilesRef.current) map.removeLayer(tilesRef.current);
    const tiles = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
      attribution: ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    tilesRef.current = tiles;
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !user) return;
    if (userRef.current) {
      userRef.current.setLatLng([user.lat, user.lng]);
    } else {
      userRef.current = L.marker([user.lat, user.lng], {
        icon: userIcon(),
        zIndexOffset: 600,
        keyboard: false,
      })
        .bindTooltip("You are here", { direction: "top" })
        .addTo(map);
    }
    if (!didFitRef.current) {
      map.setView([user.lat, user.lng], Math.max(map.getZoom(), 14));
      didFitRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = stationLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const station of stations) {
      const marker = L.marker([station.lat, station.lng], {
        icon: stationIcon(station.name, station.id === selectedId),
        zIndexOffset: station.id === selectedId ? 500 : 200,
        title: station.name,
      });
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onSelectRef.current(station.id);
      });
      marker.bindTooltip(station.name, { direction: "top", offset: [0, -10] });
      marker.addTo(layer);
    }
  }, [stations, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      map.removeLayer(routeRef.current);
      routeRef.current = null;
    }
    if (route.length > 1) {
      routeRef.current = L.polyline(route, {
        color: dark ? "#5eead4" : "#0f766e",
        weight: 5,
        opacity: 0.9,
        lineJoin: "round",
      }).addTo(map);
      map.fitBounds(routeRef.current.getBounds(), { padding: [48, 48] });
    }
  }, [route, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = stations.find((station) => station.id === selectedId);
    if (selected) map.panTo([selected.lat, selected.lng], { animate: true });
  }, [selectedId, stations]);

  return <div ref={containerRef} className="map-canvas" role="application" aria-label="Metro map" />;
}
