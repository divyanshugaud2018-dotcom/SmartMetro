import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedStations } from "@/db/schema";
import { missingDeviceResponse, readDeviceId } from "@/lib/device";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const { id } = await params;
  const body = (await request.json()) as {
    isPreferred?: boolean;
    notes?: string | null;
  };

  if (body.isPreferred) {
    await db
      .update(savedStations)
      .set({ isPreferred: false, updatedAt: new Date() })
      .where(eq(savedStations.deviceId, deviceId));
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.isPreferred === "boolean") patch.isPreferred = body.isPreferred;
  if (body.notes !== undefined) patch.notes = body.notes;

  const updated = await db
    .update(savedStations)
    .set(patch)
    .where(and(eq(savedStations.id, id), eq(savedStations.deviceId, deviceId)))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Station not found." }, { status: 404 });
  }
  return NextResponse.json({ station: updated[0] });
}

export async function DELETE(request: Request, { params }: Params) {
  const deviceId = readDeviceId(request);
  if (!deviceId) return missingDeviceResponse();
  const { id } = await params;
  await db
    .delete(savedStations)
    .where(and(eq(savedStations.id, id), eq(savedStations.deviceId, deviceId)));
  return NextResponse.json({ ok: true });
}
