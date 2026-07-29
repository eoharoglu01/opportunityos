import { NextResponse } from "next/server";
import { createStoreRepository } from "../../../repositories/factory";
import { StoreService } from "../../../services/StoreService";
import { AppError, createErrorResponse } from "../../../lib/errors";

const storeService = new StoreService(createStoreRepository());

export async function GET() {
  try {
    const stores = await storeService.list();
    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}
