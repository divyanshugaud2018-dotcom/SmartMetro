import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";
import { getOrCreatePreferences, toAppPreferences } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const row = await getOrCreatePreferences(deviceId);
  return NextResponse.json({ preferences: toAppPreferences(row) });
}

export async function PUT(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();

  const body = (await request.json()) as Record<string, unknown>;
  await getOrCreatePreferences(deviceId);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const booleans = [
    "proximityAlerts",
    "preferredStationReminders",
    "serviceAlerts",
    "browserNotifications",
    "trackingEnabled",
  ] as const;
  for (const key of booleans) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (typeof body.proximityRadiusMeters === "number") {
    patch.proximityRadiusMeters = Math.min(2000, Math.max(100, Math.round(body.proximityRadiusMeters)));
  }
  if (body.reminderHour === null || typeof body.reminderHour === "number") {
    patch.reminderHour = body.reminderHour;
  }
  if (body.reminderMinute === null || typeof body.reminderMinute === "number") {
    patch.reminderMinute = body.reminderMinute;
  }
  if (typeof body.reminderDays === "string") patch.reminderDays = body.reminderDays;
  if (body.theme === "light" || body.theme === "dark" || body.theme === "system") {
    patch.theme = body.theme;
  }
  if (body.mapProvider === "auto" || body.mapProvider === "osm" || body.mapProvider === "google") {
    patch.mapProvider = body.mapProvider;
  }

  const updated = await db
    .update(notificationPreferences)
    .set(patch)
    .where(eq(notificationPreferences.deviceId, deviceId))
    .returning();

  return NextResponse.json({ preferences: toAppPreferences(updated[0]) });
}
