import { NextResponse } from "next/server";
import { supabase } from "../../../src/lib/supabase";
export async function GET() {
    if (!supabase) {
  return NextResponse.json({
    success: false,
    error: "Supabase bağlantısı kurulamadı.",
  });
}
  const { data, error } = await supabase
    .from("store_locations")
    .select("*");

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
    data,
  });
}