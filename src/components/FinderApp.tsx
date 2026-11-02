"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import MapView from "@/components/MapView";
import StationCard from "@/components/StationCard";
import StationDetails from "@/components/StationDetails";
import WelcomeModal from "@/components/WelcomeModal";
import { IconLocate, IconSearch } from "@/components/Icons";
import { api, postNotification, showBrowserNotification } from "@/lib/client";
import { currentDark } from "@/lib/theme";
import { haversineMeters } from "@/lib/geo";
import type {
  AppPreferences,
  GeocodeHit,
  MapConfig,
  MetroStation,
  RouteEstimate,
  SavedStationRecord,
  TravelMode,
  UserLocation,
} from "@/lib/types";

const RADII = [1, 3, 5, 10] as const;
const VOICE_LANGUAGES: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  gu: "gu-IN",
  pa: "pa-IN",
};
const DEFAULT_PREFS: AppPreferences = {
  proximityAlerts: true,
  preferredStationReminders: true,
  serviceAlerts: false,
  browserNotifications: false,
  trackingEnabled: false,
  proximityRadiusMeters: 400,
  reminderHour: null,
  reminderMinute: null,
  reminderDays: "1,2,3,4,5",
  theme: "system",
  mapProvider: "auto",
};

const MAX_INITIAL_LOCATION_ACCURACY_METERS = 5_000;
const MAX_TRACKING_ACCURACY_METERS = 300;

function hourKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
}

function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function bearing(from: [number, number], to: [number, number]): number {
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0] * Math.PI / 180;
  const deltaLng = (to[1] - from[1]) * Math.PI / 180;
  return (Math.atan2(
    Math.sin(deltaLng) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng),
  ) * 180 / Math.PI + 360) % 360;
}

function turnDirection(turn: number): string {
  const difference = (turn + 180) % 360 - 180;
  if (difference > 45) return "turn left";
  if (difference < -45) return "turn right";
  return "continue straight";
}

export default function FinderApp() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [welcome, setWelcome] = useState(false);
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_PREFS);
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [user, setUser] = useState<UserLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [stations, setStations] = useState<MetroStation[]>([]);
  const [providerNote, setProviderNote] = useState<string | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saved, setSaved] = useState<SavedStationRecord[]>([]);
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [routing, setRouting] = useState(false);
  const [dark, setDark] = useState(false);
  const [mapHint, setMapHint] = useState("Tap the map to drop a pin if GPS is unavailable.");
  const [journeyActive, setJourneyActive] = useState(false);
  const [audioGuidance, setAudioGuidance] = useState(true);
  const [journeyStatus, setJourneyStatus] = useState("");
  const watchRef = useRef<number | null>(null);
  const journeyWatchRef = useRef<number | null>(null);
  const lastInstructionRef = useRef("");
  const stationRequestRef = useRef(0);
  const lastReminderRef = useRef<string>("");
  const serviceNoticeRef = useRef(false);

  const selected = stations.find((station) => station.id === selectedId) ?? null;
  const preferred = saved.find((station) => station.isPreferred) ?? null;

  const filteredStations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const withinRadius = stations.filter((station) => station.distanceMeters <= radiusKm * 1000);
    if (!needle) return withinRadius;
    return withinRadius.filter((station) => {
      const blob = `${station.name} ${station.address ?? ""} ${station.network ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [stations, query, radiusKm]);

  const mapProvider: "osm" | "google" =
    prefs.mapProvider === "google" && Boolean(config?.googleMapsClient)
      ? "google"
      : "osm";

  const refreshSaved = useCallback(async () => {
    try {
      const data = await api<{ stations: SavedStationRecord[] }>("/api/saved-stations");
      setSaved(data.stations);
    } catch {
      // Device row may not exist yet.
    }
  }, []);

  const reverse = useCallback(async (lat: number, lng: number) => {
    try {
      const data = await api<{ address: string | null }>(`/api/geocode?lat=${lat}&lng=${lng}`);
      setUser((current) =>
        current && current.lat === lat && current.lng === lng
          ? { ...current, address: data.address }
          : current,
      );
    } catch {
      return;
    }
  }, []);

  const locate = useCallback((manualWelcome = false) => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser. Search for a place or tap the map.");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);

    const applyPosition = (position: GeolocationPosition) => {
        if (position.coords.accuracy > MAX_INITIAL_LOCATION_ACCURACY_METERS) {
          setGeoBusy(false);
          setGeoError(
            `Location is too approximate (${Math.round(position.coords.accuracy / 10) * 10} m accuracy). Move to an open area, enable device location, then try again.`,
          );
          return;
        }
        const next: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
        };
        setUser(next);
        setGeoBusy(false);
        if (manualWelcome) localStorage.setItem("smf-welcome-seen", "1");
        void reverse(next.lat, next.lng);
        if (position.coords.accuracy > 1000) {
          setGeoError(`Location accuracy is approximate (${Math.round(position.coords.accuracy / 10) * 10} m). You can tap the map to refine it.`);
        }
    };

    const handleError = (error: GeolocationPositionError) => {
        setGeoBusy(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission was denied. Search for an address or tap the map to drop a pin.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("GPS timed out. Try Locate Me again, or set a location manually.");
        } else {
          setGeoError("GPS is unavailable. Enter a place name or tap the map.");
        }
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            handleError,
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
          );
          return;
        }
        handleError(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [reverse]);

  const loadStations = useCallback(async (lat: number, lng: number, radius: number) => {
    const requestId = ++stationRequestRef.current;
    const cacheKey = `smf-nearby:${radius}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
    setLoadingStations(true);
    setStationError(null);
    try {
      const data = await api<{
        stations: MetroStation[];
        provider: string;
        warning?: string;
      }>("/api/stations/nearby", {
        method: "POST",
        body: JSON.stringify({ lat, lng, radiusMeters: radius * 1000 }),
      });
      if (requestId !== stationRequestRef.current) return;
      setStations(data.stations);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          savedAt: Date.now(),
          stations: data.stations,
        }));
      } catch {
        // Storage can be unavailable in private browsing.
      }
      setProviderNote(
        data.warning ||
          (data.provider === "google"
            ? "Stations from Google Places."
            : data.provider === "hybrid"
              ? "Stations combined from Google Places and OpenStreetMap."
              : "Stations from OpenStreetMap. Add a Google Maps API key for Places (New) results."),
      );
      setSelectedId((current) => {
        if (current && data.stations.some((station) => station.id === current)) return current;
        return data.stations[0]?.id ?? null;
      });
    } catch (error) {
      if (requestId !== stationRequestRef.current) return;
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "null") as {
          savedAt?: number;
          stations?: MetroStation[];
        } | null;
        if (cached?.stations?.length && Date.now() - (cached.savedAt ?? 0) < 7 * 24 * 60 * 60 * 1000) {
          setStations(cached.stations);
          setProviderNote("Showing recently saved stations because the network is unavailable.");
          setSelectedId(cached.stations[0]?.id ?? null);
          return;
        }
      } catch {
        // A malformed offline cache must not block the normal error state.
      }
      setStationError(error instanceof Error ? error.message : "Could not load stations.");
      setStations([]);
    } finally {
      if (requestId === stationRequestRef.current) setLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    setWelcome(localStorage.getItem("smf-welcome-seen") !== "1");
    setDark(currentDark());
    const observer = new MutationObserver(() => setDark(currentDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    void api<{ preferences: AppPreferences }>("/api/preferences")
      .then((data) => setPrefs(data.preferences))
      .catch(() => undefined);
    void api<MapConfig>("/api/config")
      .then(setConfig)
      .catch(() => undefined);
    void refreshSaved();
    const pending = sessionStorage.getItem("smf-focus-station");
    if (pending) {
      try {
        const parsed = JSON.parse(pending) as UserLocation & { name?: string };
        setUser({
          lat: parsed.lat,
          lng: parsed.lng,
          source: "search",
          address: parsed.address,
        });
      } catch {
        // ignore
      }
      sessionStorage.removeItem("smf-focus-station");
    }
    return () => observer.disconnect();
  }, [refreshSaved]);

  const userLat = user?.lat;
  const userLng = user?.lng;

  useEffect(() => {
    if (userLat == null || userLng == null) return;
    void loadStations(userLat, userLng, radiusKm);
  }, [userLat, userLng, radiusKm, loadStations]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed });
      if (user) {
        params.set("lat", String(user.lat));
        params.set("lng", String(user.lng));
      }
      api<{ places: GeocodeHit[] }>(`/api/geocode/search?${params.toString()}`)
        .then((data) => setHits(data.places))
        .catch(() => setHits([]));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, user]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (!prefs.trackingEnabled) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > MAX_TRACKING_ACCURACY_METERS) {
          setGeoError(
            `Live location is approximate (${Math.round(position.coords.accuracy / 10) * 10} m accuracy). Nearby alerts remain paused until GPS improves.`,
          );
          return;
        }
        const next: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
        };
        setUser((current) => {
          if (
            current &&
            Math.abs(current.lat - next.lat) < 0.00005 &&
            Math.abs(current.lng - next.lng) < 0.00005
          ) {
            return current;
          }
          return { ...next, address: current?.address ?? null };
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [prefs.trackingEnabled]);

  useEffect(() => {
    if (!prefs.trackingEnabled || !prefs.proximityAlerts || !user) return;
    if (user.accuracy != null && user.accuracy > MAX_TRACKING_ACCURACY_METERS) return;
    const target =
      preferred ??
      (selected
        ? {
            id: selected.id,
            name: selected.name,
            lat: selected.lat,
            lng: selected.lng,
          }
        : null);
    if (!target) return;
    const R = 6371000;
    const dLat = ((target.lat - user.lat) * Math.PI) / 180;
    const dLng = ((target.lng - user.lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((user.lat * Math.PI) / 180) *
        Math.cos((target.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const meters = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    if (meters > prefs.proximityRadiusMeters) return;
    const key = `proximity:${target.id}:${hourKey()}`;
    void postNotification({
      type: "proximity",
      title: `You are near ${target.name}`,
      body: `About ${Math.round(meters)} m away. This is a location alert, not a train arrival.`,
      stationName: target.name,
      stationId: String(target.id),
      dedupeKey: key,
    }).then((result) => {
      if (result.created && prefs.browserNotifications) {
        showBrowserNotification(`You are near ${target.name}`, "Location proximity alert — not a train time.");
      }
    });
  }, [prefs, user, preferred, selected]);

  useEffect(() => {
    if (!prefs.preferredStationReminders || !preferred) return;
    if (prefs.reminderHour == null || prefs.reminderMinute == null) return;
    const tick = () => {
      const now = new Date();
      const days = prefs.reminderDays.split(",").map((item) => Number(item.trim()));
      if (!days.includes(now.getDay())) return;
      if (now.getHours() !== prefs.reminderHour || now.getMinutes() !== prefs.reminderMinute) return;
      const key = `reminder:${preferred.id}:${dayKey(now)}`;
      if (lastReminderRef.current === key) return;
      lastReminderRef.current = key;
      void postNotification({
        type: "reminder",
        title: `Time to leave for ${preferred.name}`,
        body: "This is a reminder you scheduled. Check official boards for actual train times.",
        stationName: preferred.name,
        stationId: preferred.id,
        dedupeKey: key,
      }).then((result) => {
        if (result.created && prefs.browserNotifications) {
          showBrowserNotification(`Time to leave for ${preferred.name}`, "Scheduled reminder — not live arrival data.");
        }
      });
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [prefs, preferred]);

  useEffect(() => {
    if (!prefs.serviceAlerts || serviceNoticeRef.current) return;
    serviceNoticeRef.current = true;
    void postNotification({
      type: "system",
      title: "Live disruption feed is not connected",
      body: "This app does not invent delays. Open Alerts or the guide for official metro status pages.",
      dedupeKey: `service-limitation:${dayKey()}`,
    });
  }, [prefs.serviceAlerts]);

  async function choosePlace(hit: GeocodeHit) {
    setUser({
      lat: hit.lat,
      lng: hit.lng,
      source: "search",
      address: hit.address,
    });
    setSearchOpen(false);
    setQuery(hit.label);
    setHits([]);
  }

  function onMapClick(lat: number, lng: number) {
    setUser({ lat, lng, source: "map-click" });
    setMapHint("Map pin set. Nearby stations will refresh from this point.");
    void reverse(lat, lng);
  }

  async function saveStation(station: MetroStation, makePreferred = false) {
    await api("/api/saved-stations", {
      method: "POST",
      body: JSON.stringify({
        name: station.name,
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        osmId: station.osmId,
        placeId: station.placeId ?? station.id,
        network: station.network,
        operator: station.operator,
        source: station.source,
        isPreferred: makePreferred || preferred?.placeId === (station.placeId ?? station.id),
      }),
    });
    await refreshSaved();
  }

  async function makePreferred(station: MetroStation) {
    const existing = saved.find(
      (row) => row.placeId === (station.placeId ?? station.id) || (row.name === station.name && row.lat === station.lat),
    );
    if (existing) {
      await api(`/api/saved-stations/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPreferred: true }),
      });
      await refreshSaved();
      return;
    }
    await saveStation(station, true);
  }

  async function requestRoute(mode: TravelMode) {
    if (!selected || !user) return;
    setRouting(true);
    try {
      const data = await api<{ route: RouteEstimate; mapsUrl: string }>("/api/directions", {
        method: "POST",
        body: JSON.stringify({
          fromLat: user.lat,
          fromLng: user.lng,
          toLat: selected.lat,
          toLng: selected.lng,
          mode,
        }),
      });
      setRoute(data.route);
      if (mode === "transit") {
        window.open(data.mapsUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setRoute(null);
    } finally {
      setRouting(false);
    }
  }

  const announceJourney = useCallback((message: string) => {
    setJourneyStatus(message);
    if (!audioGuidance || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voiceLanguage = localStorage.getItem("smf-voice-language") || "en";
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = VOICE_LANGUAGES[voiceLanguage] ?? "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((voice) => voice.lang.replace("_", "-").startsWith(utterance.lang.split("-")[0]));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  }, [audioGuidance]);

  const startJourney = useCallback(() => {
    if (!route || !user || !navigator.geolocation) {
      announceJourney("A route and current location are needed before starting guidance.");
      return;
    }
    setJourneyActive(true);
    lastInstructionRef.current = "";
    announceJourney(`Journey started to ${selected?.name ?? "the metro station"}. Follow the spoken directions.`);
  }, [announceJourney, route, selected?.name, user]);

  const stopJourney = useCallback(() => {
    if (journeyWatchRef.current != null) {
      navigator.geolocation.clearWatch(journeyWatchRef.current);
      journeyWatchRef.current = null;
    }
    setJourneyActive(false);
    announceJourney("Journey guidance stopped.");
  }, [announceJourney]);

  useEffect(() => {
    if (!journeyActive || !route || !navigator.geolocation) return;

    journeyWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > MAX_TRACKING_ACCURACY_METERS) return;
        const current: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUser({
          lat: current[0],
          lng: current[1],
          accuracy: position.coords.accuracy,
          source: "gps",
        });

        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        route.geometry.forEach((point, index) => {
          const distance = haversineMeters(current[0], current[1], point[0], point[1]);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });

        const destination = route.geometry[route.geometry.length - 1];
        const destinationDistance = haversineMeters(current[0], current[1], destination[0], destination[1]);
        let instruction: string | null = null;

        if (destinationDistance < 30) {
          instruction = `You have arrived at ${selected?.name ?? "the metro station"}.`;
        } else {
          const nextIndex = Math.min(nearestIndex + 1, route.geometry.length - 1);
          const nextPoint = route.geometry[nextIndex];
          const distanceToNext = Math.round(haversineMeters(current[0], current[1], nextPoint[0], nextPoint[1]));

          if (nextIndex > 0 && nextIndex < route.geometry.length - 1) {
            const incoming = bearing(route.geometry[nextIndex - 1], nextPoint);
            const outgoing = bearing(nextPoint, route.geometry[Math.min(nextIndex + 1, route.geometry.length - 1)]);
            const direction = turnDirection(((outgoing - incoming + 540) % 360) - 180);
            if (distanceToNext <= 40 && lastInstructionRef.current !== `${nextIndex}-turn`) {
              instruction = `${direction} in about ${distanceToNext} metres, then continue to the station.`;
              lastInstructionRef.current = `${nextIndex}-turn`;
            }
          }
          if (!instruction && distanceToNext <= 80 && lastInstructionRef.current !== `${nextIndex}-distance`) {
            instruction = `Continue ahead. The metro station is ${Math.max(30, Math.round(destinationDistance))} metres away.`;
            lastInstructionRef.current = `${nextIndex}-distance`;
          }
        }

        if (instruction) announceJourney(instruction);
        if (destinationDistance < 30 && journeyWatchRef.current != null) {
          navigator.geolocation.clearWatch(journeyWatchRef.current);
          journeyWatchRef.current = null;
          setJourneyActive(false);
        }
      },
      () => announceJourney("GPS guidance is unavailable. Check location permission or move to an open area."),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );

    return () => {
      if (journeyWatchRef.current != null) navigator.geolocation.clearWatch(journeyWatchRef.current);
      journeyWatchRef.current = null;
    };
  }, [announceJourney, journeyActive, route, selected?.name]);

  const savedIds = new Set(saved.map((row) => row.placeId).filter(Boolean));
  const coordsLabel = user
    ? `${user.lat.toFixed(5)}, ${user.lng.toFixed(5)}`
    : "Location not set";

  return (
    <AppShell>
      <WelcomeModal
        open={welcome}
        onLocate={() => {
          setWelcome(false);
          localStorage.setItem("smf-welcome-seen", "1");
          locate(true);
        }}
        onSearch={() => {
          setWelcome(false);
          localStorage.setItem("smf-welcome-seen", "1");
          searchRef.current?.focus();
        }}
        onDismiss={() => {
          setWelcome(false);
          localStorage.setItem("smf-welcome-seen", "1");
        }}
      />

      <div className="finder">
        <section className="finder-side">
          <div className="search-wrap">
            <IconSearch className="search-icon" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search a station, street, or city"
              aria-label="Search stations or places"
            />
            {searchOpen && hits.length > 0 ? (
              <ul className="suggest-list">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button type="button" onClick={() => void choosePlace(hit)}>
                      <strong>{hit.label}</strong>
                      <span>{hit.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="location-card">
            <div>
              <p className="kicker">Current point</p>
              <p className="coord">{coordsLabel}</p>
              <p className="muted">{user?.address || mapHint}</p>
              {user?.accuracy ? (
                <p className="fine-print">GPS accuracy about {Math.round(user.accuracy)} m · source {user.source}</p>
              ) : (
                <p className="fine-print">Source: {user?.source ?? "none"}</p>
              )}
            </div>
            <button type="button" className="locate-btn" onClick={() => locate()} disabled={geoBusy}>
              <IconLocate className="h-4 w-4" />
              {geoBusy ? "Locating…" : "Locate me"}
            </button>
          </div>

          {geoError ? <p className="banner banner-warn">{geoError}</p> : null}
          {config && !config.googleMapsServer ? (
            <p className="banner banner-info">
              Google Places is optional. Nearby stations currently come from OpenStreetMap. See Setup for API keys.
            </p>
          ) : null}

          <div className="filter-row">
            <p>Radius</p>
            <div className="segmented">
              {RADII.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === radiusKm ? "is-active" : ""}
                  onClick={() => setRadiusKm(value)}
                >
                  {value} km
                </button>
              ))}
            </div>
          </div>

          <div className="list-head">
            <h1>Nearby stations</h1>
            <span>
              {loadingStations ? "Updating…" : `${filteredStations.length} found`}
            </span>
          </div>
          {providerNote ? <p className="fine-print">{providerNote}</p> : null}
          {stationError ? <p className="banner banner-warn">{stationError}</p> : null}
          {stationError && user ? (
            <button
              type="button"
              className="secondary-btn retry-btn"
              onClick={() => void loadStations(user.lat, user.lng, radiusKm)}
            >
              Try station search again
            </button>
          ) : null}

          <div className="station-line" role="list" aria-busy={loadingStations}>
            {loadingStations && user ? (
              <>
                {[0, 1, 2].map((item) => (
                  <div className="station-skeleton" key={item} aria-hidden="true">
                    <span />
                    <div>
                      <i />
                      <i />
                    </div>
                  </div>
                ))}
              </>
            ) : null}
            {!user && !loadingStations ? (
              <div className="empty-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/station-chrome.jpg" alt="Modern metro station interior" />
                <p>Set a location to see metro and rail stations around you.</p>
              </div>
            ) : null}
            {user && !loadingStations && filteredStations.length === 0 ? (
              <div className="empty-card">
                <p>No named metro or rail stations found in this radius. Try 5–10 km or search another area.</p>
              </div>
            ) : null}
            {filteredStations.map((station) => (
              <div key={station.id} role="listitem">
                <StationCard
                  station={station}
                  selected={station.id === selectedId}
                  saved={savedIds.has(station.placeId ?? station.id)}
                  preferred={
                    preferred?.placeId === (station.placeId ?? station.id) ||
                    (preferred?.name === station.name && preferred.lat === station.lat)
                  }
                  onSelect={() => {
                    setSelectedId(station.id);
                    setRoute(null);
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="finder-map">
          <MapView
            provider={mapProvider}
            user={user}
            stations={filteredStations}
            selectedId={selectedId}
            route={route?.geometry ?? []}
            dark={dark}
            onSelect={(id) => {
              setSelectedId(id);
              setRoute(null);
            }}
            onMapClick={onMapClick}
          />
          <button type="button" className="fab-locate" onClick={() => locate()} aria-label="Locate me">
            <IconLocate className="h-5 w-5" />
          </button>
          {selected ? (
            <StationDetails
              station={selected}
              user={user}
              saved={savedIds.has(selected.placeId ?? selected.id)}
              preferred={
                preferred?.placeId === (selected.placeId ?? selected.id) ||
                (preferred?.name === selected.name && preferred.lat === selected.lat)
              }
              route={route}
              routing={routing}
              onClose={() => setSelectedId(null)}
              onSave={() => void saveStation(selected)}
              onPreferred={() => void makePreferred(selected)}
              onRoute={(mode) => void requestRoute(mode)}
              journeyActive={journeyActive}
              audioGuidance={audioGuidance}
              journeyStatus={journeyStatus}
              onStartJourney={startJourney}
              onStopJourney={stopJourney}
              onToggleAudio={() => setAudioGuidance((current) => !current)}
            />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
