import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("catalog");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF dosyası bulunamadı.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PDF başarıyla alındı.",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      products: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}