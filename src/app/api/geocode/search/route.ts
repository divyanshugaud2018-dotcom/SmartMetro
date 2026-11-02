import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  if (query.length < 2) {
    return NextResponse.json({ places: [] });
  }
  try {
    const places = await searchPlaces(query, lat, lng);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "Location search failed." }, { status: 502 });
  }
}
