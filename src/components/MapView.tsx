"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MetroStation, UserLocation } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/MapCanvas"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

const GoogleMap = dynamic(() => import("@/components/GoogleMapCanvas"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

type Props = {
  provider: "osm" | "google";
  user: UserLocation | null;
  stations: MetroStation[];
  selectedId: string | null;
  route: [number, number][];
  dark: boolean;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
};

export default function MapView(props: Props) {
  const [googleUnavailable, setGoogleUnavailable] = useState(false);

  useEffect(() => {
    setGoogleUnavailable(false);
  }, [props.provider]);

  if (props.provider === "google" && !googleUnavailable) {
    return (
      <GoogleMap
        user={props.user}
        stations={props.stations}
        selectedId={props.selectedId}
        route={props.route}
        dark={props.dark}
        onSelect={props.onSelect}
        onMapClick={props.onMapClick}
        onUnavailable={() => setGoogleUnavailable(true)}
      />
    );
  }
  return (
    <LeafletMap
      user={props.user}
      stations={props.stations}
      selectedId={props.selectedId}
      route={props.route}
      dark={props.dark}
      onSelect={props.onSelect}
      onMapClick={props.onMapClick}
    />
  );
}
