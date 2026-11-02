import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { notificationHistory, notificationPreferences } from "@/db/schema";
import type { AppPreferences } from "@/lib/types";

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

export async function getOrCreatePreferences(deviceId: string) {
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.deviceId, deviceId))
    .limit(1);

  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(notificationPreferences)
    .values({ deviceId, ...DEFAULT_PREFS })
    .returning();
  return inserted[0];
}

export function toAppPreferences(
  row: typeof notificationPreferences.$inferSelect,
): AppPreferences {
  return {
    proximityAlerts: row.proximityAlerts,
    preferredStationReminders: row.preferredStationReminders,
    serviceAlerts: row.serviceAlerts,
    browserNotifications: row.browserNotifications,
    trackingEnabled: row.trackingEnabled,
    proximityRadiusMeters: row.proximityRadiusMeters,
    reminderHour: row.reminderHour,
    reminderMinute: row.reminderMinute,
    reminderDays: row.reminderDays,
    theme: (row.theme as AppPreferences["theme"]) || "system",
    mapProvider: (row.mapProvider as AppPreferences["mapProvider"]) || "auto",
  };
}

export async function recordNotification(input: {
  deviceId: string;
  type: string;
  title: string;
  body: string;
  stationName?: string | null;
  stationId?: string | null;
  dedupeKey?: string | null;
}) {
  if (input.dedupeKey) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const duplicates = await db
      .select({ id: notificationHistory.id })
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.deviceId, input.deviceId),
          eq(notificationHistory.dedupeKey, input.dedupeKey),
          gte(notificationHistory.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (duplicates[0]) {
      return { created: false as const, duplicate: true as const };
    }
  }

  const inserted = await db
    .insert(notificationHistory)
    .values({
      deviceId: input.deviceId,
      type: input.type,
      title: input.title,
      body: input.body,
      stationName: input.stationName ?? null,
      stationId: input.stationId ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })
    .returning();

  return { created: true as const, duplicate: false as const, notification: inserted[0] };
}

export async function listNotifications(deviceId: string, limit = 50) {
  return db
    .select()
    .from(notificationHistory)
    .where(eq(notificationHistory.deviceId, deviceId))
    .orderBy(desc(notificationHistory.createdAt))
    .limit(limit);
}
