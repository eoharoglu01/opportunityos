import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    service: "OpportunityOS",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
