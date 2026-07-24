import { NextResponse } from "next/server";
import { createProductRepository } from "../../../repositories/factory";
import { ProductService } from "../../../services/ProductService";
import { searchQuerySchema } from "../../../validation/schemas";
import { AppError, createErrorResponse } from "../../../lib/errors";

const productService = new ProductService(createProductRepository());

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchQuerySchema.safeParse({ query: searchParams.get("query") ?? undefined });

    if (!parsed.success) {
      throw new AppError("Invalid query", 400);
    }

    const products = await productService.list(parsed.data.query);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(createErrorResponse(error.message), { status: error.status });
    }

    return NextResponse.json(createErrorResponse("Unexpected error"), { status: 500 });
  }
}
