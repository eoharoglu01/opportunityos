import { NextResponse } from "next/server";
import { AlertService } from "../../../services/AlertService";
import { alertSchema } from "../../../validation/schemas";
import { AppError, createErrorResponse } from "../../../lib/errors";

const alertService = new AlertService();

export async function GET() {
  try {
    const alerts = await alertService.list();
    return NextResponse.json({ success: true, data: alerts });
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
    const parsed = alertSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError("Invalid alert payload", 400);
    }

    const created = await alertService.create(parsed.data);
    return NextResponse.json({ success: true, data: { created } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}
