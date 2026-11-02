export type LocationSource = "gps" | "manual" | "search" | "map-click";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  source: LocationSource;
  address?: string | null;
};

export type MetroStation = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  network: string | null;
  operator: string | null;
  source: "google" | "openstreetmap";
  placeId?: string | null;
  osmId?: string | null;
  types: string[];
  googleMapsUri?: string | null;
  wheelchair?: string | null;
  lines: string[];
  openingHours?: string | null;
};

export type TravelMode = "walking" | "driving" | "transit";

export type RouteEstimate = {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][];
  provider: "google" | "osrm" | "estimate";
  note: string;
};

export type GeocodeHit = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
};

export type AppPreferences = {
  proximityAlerts: boolean;
  preferredStationReminders: boolean;
  serviceAlerts: boolean;
  browserNotifications: boolean;
  trackingEnabled: boolean;
  proximityRadiusMeters: number;
  reminderHour: number | null;
  reminderMinute: number | null;
  reminderDays: string;
  theme: "light" | "dark" | "system";
  mapProvider: "auto" | "osm" | "google";
};

export type AppNotification = {
  id: string;
  type: "proximity" | "reminder" | "service" | "system";
  title: string;
  body: string;
  stationName: string | null;
  stationId: string | null;
  read: boolean;
  createdAt: string;
};

export type SavedStationRecord = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  osmId: string | null;
  placeId: string | null;
  network: string | null;
  operator: string | null;
  notes: string | null;
  source: string;
  isPreferred: boolean;
  createdAt: string;
};

export type OfficialSourceRecord = {
  id: string;
  city: string;
  region: string | null;
  agency: string;
  url: string;
  statusUrl: string | null;
  notes: string | null;
};

export type MapConfig = {
  googleMapsClient: boolean;
  googleMapsServer: boolean;
  placesProvider: "google" | "openstreetmap" | "hybrid";
};
