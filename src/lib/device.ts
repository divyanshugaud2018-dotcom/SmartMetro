import { NextResponse } from "next/server";

export const DEVICE_HEADER = "x-device-id";

export function readDeviceId(request: Request): string | null {
  const header = request.headers.get(DEVICE_HEADER)?.trim();
  if (!header) return null;
  if (header.length < 8 || header.length > 80) return null;
  return header;
}

export function missingDeviceResponse(): NextResponse {
  return NextResponse.json(
    { error: "Missing device id. Refresh the page to continue." },
    { status: 400 },
  );
}
