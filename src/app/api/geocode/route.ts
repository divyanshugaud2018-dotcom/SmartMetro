import { NextResponse } from "next/server";
import { isValidCoord } from "@/lib/geo";
import { reverseGeocode } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!isValidCoord(lat, lng)) {
    return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  }
  try {
    const address = await reverseGeocode(lat, lng);
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ address: null });
  }
}
