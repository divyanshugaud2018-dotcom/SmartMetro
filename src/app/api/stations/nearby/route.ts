import { NextResponse } from "next/server";
import { isValidCoord } from "@/lib/geo";
import { findNearbyStations } from "@/lib/stations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lat?: number;
      lng?: number;
      radiusMeters?: number;
    };
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const radiusMeters = Number(body.radiusMeters ?? 3000);
    if (!isValidCoord(lat, lng)) {
      return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
    }
    const result = await findNearbyStations(lat, lng, radiusMeters);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to look up nearby metro stations.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
