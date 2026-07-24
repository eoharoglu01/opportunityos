import { NextResponse } from "next/server";
import { FavoriteService } from "../../../services/FavoriteService";
import { favoriteSchema } from "../../../validation/schemas";
import { AppError, createErrorResponse } from "../../../lib/errors";

const favoriteService = new FavoriteService();

export async function GET() {
  try {
    const favorites = await favoriteService.list();
    return NextResponse.json({ success: true, data: favorites });
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
    const parsed = favoriteSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError("Invalid favorite payload", 400);
    }

    const added = await favoriteService.add(parsed.data.productId);
    return NextResponse.json({ success: true, data: { added } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}
