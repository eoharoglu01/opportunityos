import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: "Supabase bağlantısı kurulamadı.",
      },
      {
        status: 500,
      },
    );
  }

  const barcode = request.nextUrl.searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      {
        success: false,
        error: "Barkod bilgisi gerekli.",
      },
      {
        status: 400,
      },
    );
  }

  const { data, error } = await supabase
    .from("product_barcodes")
    .select("barcode, product_name, brand, quantity")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) {
    console.error("Barkod sorgulama hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Ürün bilgisi alınamadı.",
      },
      {
        status: 500,
      },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu barkoda ait ürün bulunamadı.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    success: true,
    product: data,
  });
}