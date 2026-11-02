import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";
import { searchStationsByText } from "@/lib/stations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;

  if (query.length < 2) {
    return NextResponse.json({ stations: [], places: [] });
  }

  try {
    const [stations, places] = await Promise.all([
      searchStationsByText(query, lat, lng),
      searchPlaces(query, lat, lng),
    ]);
    return NextResponse.json({ stations, places });
  } catch {
    return NextResponse.json(
      { error: "Search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
