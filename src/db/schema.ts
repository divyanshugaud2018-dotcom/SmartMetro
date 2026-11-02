import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const savedStations = pgTable(
  "saved_stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    osmId: text("osm_id"),
    placeId: text("place_id"),
    network: text("network"),
    operator: text("operator"),
    notes: text("notes"),
    source: text("source").notNull().default("openstreetmap"),
    isPreferred: boolean("is_preferred").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("saved_stations_device_idx").on(table.deviceId),
    uniqueIndex("saved_stations_device_place_idx").on(table.deviceId, table.placeId),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  proximityAlerts: boolean("proximity_alerts").notNull().default(true),
  preferredStationReminders: boolean("preferred_station_reminders").notNull().default(true),
  serviceAlerts: boolean("service_alerts").notNull().default(false),
  browserNotifications: boolean("browser_notifications").notNull().default(false),
  trackingEnabled: boolean("tracking_enabled").notNull().default(false),
  proximityRadiusMeters: integer("proximity_radius_meters").notNull().default(400),
  reminderHour: integer("reminder_hour"),
  reminderMinute: integer("reminder_minute"),
  reminderDays: text("reminder_days").notNull().default("1,2,3,4,5"),
  theme: text("theme").notNull().default("system"),
  mapProvider: text("map_provider").notNull().default("auto"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationHistory = pgTable(
  "notification_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    stationName: text("station_name"),
    stationId: text("station_id"),
    dedupeKey: text("dedupe_key"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notification_history_device_idx").on(table.deviceId),
    index("notification_history_dedupe_idx").on(table.deviceId, table.dedupeKey),
  ],
);

export const officialSources = pgTable("official_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  city: text("city").notNull(),
  region: text("region"),
  agency: text("agency").notNull(),
  url: text("url").notNull(),
  statusUrl: text("status_url"),
  notes: text("notes"),
});

export type SavedStation = typeof savedStations.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NotificationRecord = typeof notificationHistory.$inferSelect;
export type OfficialSource = typeof officialSources.$inferSelect;
