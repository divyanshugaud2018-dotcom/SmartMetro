"use client";

import { formatDistance, formatDuration, estimateWalkSeconds } from "@/lib/geo";
import type { MetroStation } from "@/lib/types";
import { IconStar } from "@/components/Icons";

type Props = {
  station: MetroStation;
  selected?: boolean;
  saved?: boolean;
  preferred?: boolean;
  onSelect: () => void;
};

export default function StationCard({ station, selected, saved, preferred, onSelect }: Props) {
  const typeLabel = station.types.includes("subway_station")
    ? "Metro"
    : station.types.includes("light_rail_station")
      ? "Light rail"
      : station.types.includes("train_station")
        ? "Rail"
        : "Transit";

  return (
    <button type="button" className={selected ? "station-card is-selected" : "station-card"} onClick={onSelect}>
      <span className="line-dot" aria-hidden="true" />
      <span className="station-card-body">
        <span className="station-card-top">
          <span className="station-name">{station.name}</span>
          <span className="distance-pill">{formatDistance(station.distanceMeters)}</span>
        </span>
        <span className="station-meta">
          <span className="chip">{typeLabel}</span>
          {station.network ? <span className="chip chip-quiet">{station.network}</span> : null}
          {saved ? (
            <span className="chip chip-quiet">
              <IconStar className="h-3 w-3" /> Saved
            </span>
          ) : null}
          {preferred ? <span className="chip chip-accent">Preferred</span> : null}
        </span>
        <span className="station-sub">
          {station.address || "Address not listed"}
          <span className="dot-sep">·</span>
          Est. walk {formatDuration(estimateWalkSeconds(station.distanceMeters))}
        </span>
      </span>
    </button>
  );
}
