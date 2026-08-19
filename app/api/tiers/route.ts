import { NextResponse } from "next/server";
import { computeTiers } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await computeTiers();
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
