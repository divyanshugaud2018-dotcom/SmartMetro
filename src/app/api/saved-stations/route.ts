import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedStations } from "@/db/schema";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";
import { isValidCoord } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const rows = await db
    .select()
    .from(savedStations)
    .where(eq(savedStations.deviceId, deviceId))
    .orderBy(desc(savedStations.isPreferred), desc(savedStations.createdAt));
  return NextResponse.json({ stations: rows });
}

export async function POST(request: Request) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const body = (await request.json()) as {
    name?: string;
    address?: string | null;
    lat?: number;
    lng?: number;
    osmId?: string | null;
    placeId?: string | null;
    network?: string | null;
    operator?: string | null;
    notes?: string | null;
    source?: string;
    isPreferred?: boolean;
  };

  const name = body.name?.trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!name || !isValidCoord(lat, lng)) {
    return NextResponse.json({ error: "A station name and coordinates are required." }, { status: 400 });
  }

  if (body.isPreferred) {
    await db
      .update(savedStations)
      .set({ isPreferred: false, updatedAt: new Date() })
      .where(eq(savedStations.deviceId, deviceId));
  }

  const existing = body.placeId
    ? await db
        .select()
        .from(savedStations)
        .where(and(eq(savedStations.deviceId, deviceId), eq(savedStations.placeId, body.placeId)))
        .limit(1)
    : [];

  if (existing[0]) {
    const updated = await db
      .update(savedStations)
      .set({
        name,
        address: body.address ?? existing[0].address,
        lat,
        lng,
        isPreferred: body.isPreferred ?? existing[0].isPreferred,
        notes: body.notes ?? existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(savedStations.id, existing[0].id))
      .returning();
    return NextResponse.json({ station: updated[0] });
  }

  const inserted = await db
    .insert(savedStations)
    .values({
      deviceId,
      name,
      address: body.address ?? null,
      lat,
      lng,
      osmId: body.osmId ?? null,
      placeId: body.placeId ?? `${lat},${lng}`,
      network: body.network ?? null,
      operator: body.operator ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "openstreetmap",
      isPreferred: Boolean(body.isPreferred),
    })
    .returning();

  return NextResponse.json({ station: inserted[0] }, { status: 201 });
}
