import { NextResponse } from "next/server";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";
import { listNotifications, recordNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const rows = await listNotifications(deviceId);
  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      stationName: row.stationName,
      stationId: row.stationId,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const body = (await request.json()) as {
    type?: string;
    title?: string;
    body?: string;
    stationName?: string | null;
    stationId?: string | null;
    dedupeKey?: string | null;
  };

  const title = body.title?.trim();
  const message = body.body?.trim();
  const type = body.type?.trim() || "system";
  if (!title || !message) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const result = await recordNotification({
    deviceId,
    type,
    title,
    body: message,
    stationName: body.stationName,
    stationId: body.stationId,
    dedupeKey: body.dedupeKey,
  });

  if (!result.created) {
    return NextResponse.json({ created: false, duplicate: true });
  }

  return NextResponse.json({
    created: true,
    duplicate: false,
    notification: {
      id: result.notification.id,
      type: result.notification.type,
      title: result.notification.title,
      body: result.notification.body,
      stationName: result.notification.stationName,
      stationId: result.notification.stationId,
      read: result.notification.read,
      createdAt: result.notification.createdAt.toISOString(),
    },
  });
}
