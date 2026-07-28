import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    name: "OpportunityOS",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  });
}
