import { NextResponse } from "next/server";
import { NotificationService } from "../../../services/NotificationService";
import { notificationSchema } from "../../../validation/schemas";
import { AppError, createErrorResponse } from "../../../lib/errors";

const notificationService = new NotificationService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = notificationSchema.safeParse({ userId: searchParams.get("userId") ?? undefined });

    if (!parsed.success) {
      throw new AppError("Invalid notification query", 400);
    }

    const notifications = await notificationService.list(parsed.data.userId);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = notificationSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError("Invalid notification payload", 400);
    }

    const updated = await notificationService.markAllRead(parsed.data.userId);
    return NextResponse.json({ success: true, data: { updated } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}
