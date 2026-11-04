"use client";

import {
  IconCar,
  IconClose,
  IconExternal,
  IconStar,
  IconTransit,
  IconWalk,
} from "@/components/Icons";
import { formatDistance, formatDuration, estimateWalkSeconds } from "@/lib/geo";
import { googleMapsDirUrl, googleMapsPlaceUrl } from "@/lib/map-links";
import type { MetroStation, RouteEstimate, TravelMode, UserLocation } from "@/lib/types";

type Props = {
  station: MetroStation;
  user: UserLocation | null;
  saved: boolean;
  preferred: boolean;
  route: RouteEstimate | null;
  routing: boolean;
  journeyActive: boolean;
  audioGuidance: boolean;
  journeyStatus: string;
  onClose: () => void;
  onSave: () => void;
  onPreferred: () => void;
  onRoute: (mode: TravelMode) => void;
  onStartJourney: () => void;
  onStopJourney: () => void;
  onToggleAudio: () => void;
};

export default function StationDetails({
  station,
  user,
  saved,
  preferred,
  route,
  routing,
  journeyActive,
  audioGuidance,
  journeyStatus,
  onClose,
  onSave,
  onPreferred,
  onRoute,
  onStartJourney,
  onStopJourney,
  onToggleAudio,
}: Props) {
  const origin = user ?? { lat: station.lat, lng: station.lng };
  const walkUrl = googleMapsDirUrl(origin.lat, origin.lng, station.lat, station.lng, "walking");
  const driveUrl = googleMapsDirUrl(origin.lat, origin.lng, station.lat, station.lng, "driving");
  const transitUrl = googleMapsDirUrl(origin.lat, origin.lng, station.lat, station.lng, "transit");
  const mapsUrl = googleMapsPlaceUrl(station.googleMapsUri, station.lat, station.lng, station.name);

  return (
    <aside className="details-panel" aria-live="polite">
      <div className="details-head">
        <div>
          <p className="kicker">Station details</p>
          <h2>{station.name}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close station details">
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <p className="details-address">{station.address || "No street address in the map data."}</p>

      <dl className="stat-grid">
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(station.distanceMeters)}</dd>
        </div>
        <div>
          <dt>Est. walk</dt>
          <dd>{formatDuration(estimateWalkSeconds(station.distanceMeters))}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{station.source === "google" ? "Google Places" : "OpenStreetMap"}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{station.wheelchair === "yes" ? "Step-free noted" : station.wheelchair === "no" ? "Not step-free" : "Unknown"}</dd>
        </div>
      </dl>

      {station.network || station.operator || station.lines.length ? (
        <div className="detail-block">
          {station.network ? <p>Network: {station.network}</p> : null}
          {station.operator ? <p>Operator: {station.operator}</p> : null}
          {station.lines.length ? <p>Lines: {station.lines.join(", ")}</p> : null}
        </div>
      ) : null}

      <p className="fine-print">
        Walking time is a routing estimate, not a train arrival. Station proximity does not mean a train is coming.
      </p>
      <div className="banner banner-info">
        Need urgent help in India? Call <a href="tel:112"><strong>112</strong></a>. For official fares, routes, elevators, service changes, and crowd updates, check the operator&apos;s website below.
      </div>

      {route ? (
        <div className="route-card">
          <p className="kicker">Route preview</p>
          <p className="route-nums">
            {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)} · {route.mode}
          </p>
          <p className="fine-print">{route.note}</p>
        </div>
      ) : null}

      {route ? (
        <div className="journey-controls" aria-label="Live journey guidance">
          <button
            type="button"
            className={journeyActive ? "secondary-btn" : "primary-btn"}
            onClick={journeyActive ? onStopJourney : onStartJourney}
            disabled={!user}
          >
            {journeyActive ? "Stop journey" : "Start journey"}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onToggleAudio}
            aria-pressed={audioGuidance}
          >
            {audioGuidance ? "Audio guidance on" : "Audio guidance off"}
          </button>
          <p className="journey-status" aria-live="polite" aria-atomic="true">
            {journeyStatus || "Start the journey to receive live audio directions from your location."}
          </p>
        </div>
      ) : null}

      <div className="mode-row">
        <button type="button" className="mode-btn" onClick={() => onRoute("walking")} disabled={routing}>
          <IconWalk className="h-4 w-4" /> Walk
        </button>
        <button type="button" className="mode-btn" onClick={() => onRoute("driving")} disabled={routing}>
          <IconCar className="h-4 w-4" /> Drive
        </button>
        <button type="button" className="mode-btn" onClick={() => onRoute("transit")} disabled={routing}>
          <IconTransit className="h-4 w-4" /> Transit
        </button>
      </div>

      <div className="details-actions">
        <a className="primary-btn" href={walkUrl} target="_blank" rel="noreferrer">
          Get walking directions
        </a>
        <a className="secondary-btn" href={driveUrl} target="_blank" rel="noreferrer">
          Driving
        </a>
        <a className="secondary-btn" href={transitUrl} target="_blank" rel="noreferrer">
          Transit in Google Maps
        </a>
        <a className="secondary-btn" href={mapsUrl} target="_blank" rel="noreferrer">
          <IconExternal className="h-4 w-4" /> View on Google Maps
        </a>
        <button type="button" className="secondary-btn" onClick={onSave}>
          <IconStar className="h-4 w-4" /> {saved ? "Saved" : "Save station"}
        </button>
        <button type="button" className={preferred ? "primary-btn" : "secondary-btn"} onClick={onPreferred}>
          {preferred ? "Preferred station" : "Set as preferred"}
        </button>
      </div>
    </aside>
  );
}
