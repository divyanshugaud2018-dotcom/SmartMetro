import { NextResponse } from "next/server";
import { getRouteEstimate } from "@/lib/directions";
import type { TravelMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fromLat?: number;
      fromLng?: number;
      toLat?: number;
      toLng?: number;
      mode?: TravelMode;
    };
    const mode: TravelMode =
      body.mode === "driving" || body.mode === "transit" ? body.mode : "walking";
    const result = await getRouteEstimate(
      Number(body.fromLat),
      Number(body.fromLng),
      Number(body.toLat),
      Number(body.toLng),
      mode,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to estimate a route.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
