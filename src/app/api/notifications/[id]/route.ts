import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notificationHistory } from "@/db/schema";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const { id } = await params;
  const body = (await request.json()) as { read?: boolean };
  const updated = await db
    .update(notificationHistory)
    .set({ read: body.read !== false })
    .where(and(eq(notificationHistory.id, id), eq(notificationHistory.deviceId, deviceId)))
    .returning();
  if (!updated[0]) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const { id } = await params;
  await db
    .delete(notificationHistory)
    .where(and(eq(notificationHistory.id, id), eq(notificationHistory.deviceId, deviceId)));
  return NextResponse.json({ ok: true });
}
