import { NextResponse } from "next/server";
import { db } from "@/db";
import { officialSources } from "@/db/schema";
import { DEFAULT_OFFICIAL_SOURCES } from "@/lib/official-sources";

export const dynamic = "force-dynamic";

export async function GET() {
  let rows = await db.select().from(officialSources);
  if (!rows.length) {
    await db.insert(officialSources).values([...DEFAULT_OFFICIAL_SOURCES]);
    rows = await db.select().from(officialSources);
  }
  return NextResponse.json({ sources: rows });
}
