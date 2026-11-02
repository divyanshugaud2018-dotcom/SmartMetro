import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notificationHistory } from "@/db/schema";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  await db
    .update(notificationHistory)
    .set({ read: true })
    .where(eq(notificationHistory.deviceId, deviceId));
  return NextResponse.json({ ok: true });
}
