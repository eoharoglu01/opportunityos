import OpenAI from "openai";
import { NextResponse } from "next/server";
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
  });
}

export async function POST(request: Request) {
  try {
    const openai = getOpenAIClient();

if (!openai) {
  return NextResponse.json(
    {
      success: false,
      error:
        "OCR şu anda devre dışı. OPENAI_API_KEY tanımlanmamış.",
    },
    { status: 503 },
  );
}
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Görsel dosyası bulunamadı.",
        },
        { status: 400 },
      );
    }

    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Sadece JPG, PNG veya WEBP yüklenebilir.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
Bu görsel bir market broşürü veya market afişidir.

Görselde bulunan tüm ürünleri ve fiyatlarını oku.

Sadece geçerli JSON döndür.

Kurallar:
- Her ürün için bir nesne oluştur.
- storeName alanına afişte görünen market adını yaz.
- productName alanına ürünün tam adını yaz.
- brand alanına marka varsa yaz, yoksa boş bırak.
- price alanına sadece sayısal fiyatı yaz.
- currency alanı her zaman "TRY" olsun.
- JSON dışında hiçbir açıklama yazma.
- Emin olmadığın ürünleri ekleme.

Çıktı formatı:

[
  {
    "storeName": "A101",
    "productName": "Sütaş Tam Yağlı Süt 1 L",
    "brand": "Sütaş",
    "price": 57.90,
    "currency": "TRY"
  }
]
                `,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                },
              },
            ],
          },
        ],
      });

    const content =
      completion.choices[0]?.message?.content?.trim() ?? "[]";

    const cleanedContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let products: unknown;

    try {
      products = JSON.parse(cleanedContent);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Yapay zekâ geçerli bir JSON yanıtı döndürmedi.",
          rawContent: content,
        },
        { status: 422 },
      );
    }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        {
          success: false,
          error: "OCR sonucu ürün listesi formatında değil.",
        },
        { status: 422 },
      );
    }

return NextResponse.json({
  success: true,
  fileName: file.name,
  products,
});
  } catch (error) {
    console.error("Katalog OCR hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen hata oluştu.",
      },
      { status: 500 },
    );
  }
}