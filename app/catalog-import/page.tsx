"use client";

import { useState, type ChangeEvent } from "react";
import { catalogImportService } from "../../src/services/catalog/CatalogImportService";

type CatalogProduct = {
  storeName: string;
  productName: string;
  brand?: string;
  price: number;
  currency?: "TRY";
};

type ImportResult = {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  };
};

export default function CatalogImportPage() {
  const [jsonText, setJsonText] = useState(`[
  {
    "storeName": "A101",
    "productName": "Sütaş Tam Yağlı Süt 1 L",
    "brand": "Sütaş",
    "price": 57.90,
    "currency": "TRY"
  }
]`);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<ImportResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setSelectedImage(file);
    setResult(null);
  }

  async function handleJsonImport() {
    setLoading(true);
    setResult(null);

    try {
      const products =
        JSON.parse(jsonText) as CatalogProduct[];

      if (!Array.isArray(products)) {
        throw new Error(
          "JSON verisi bir ürün listesi olmalıdır.",
        );
      }

      const response =
        await catalogImportService.importProducts(
          products,
        );

      setResult({
        success: true,
        message: "JSON başarıyla içe aktarıldı.",
      });

      console.log(response);
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Geçersiz JSON verisi.",
      });
    } finally {
      setLoading(false);
    }
  }

async function handleImageUpload() {
  if (!selectedImage) {
    setResult({
      success: false,
      error: "Önce bir market afişi seçmelisin.",
    });
    return;
  }

  setResult({
    success: true,
    message:
      "🚧 OCR özelliği şu anda geçici olarak kapalı.\n\nBu nedenle afiş analiz edilmedi. Şimdilik JSON ile ürün aktarımını kullanacağız.",
  });
}

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: 24,
        color: "#f9fafb",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>
        🤖 Market Afişi OCR
      </h1>

      <p style={{ color: "#9ca3af" }}>
        Market afişini yükleyin.
        Yapay zekâ ürünleri otomatik analiz edip
        OpportunityOS veritabanına aktaracaktır.
      </p>

      <section
        style={{
          marginTop: 28,
          padding: 20,
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Market Afişi
        </h2>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {selectedImage && (
          <p
            style={{
              marginTop: 12,
              color: "#d1d5db",
            }}
          >
            📷 {selectedImage.name}
          </p>
        )}

        <button
          onClick={handleImageUpload}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "12px 18px",
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            fontSize: 16,
          }}
        >
          {loading
            ? "İşleniyor..."
            : "Afişi Analiz Et"}
        </button>
      </section>
      {result && (
        <section
          style={{
            marginTop: 24,
            padding: 20,
            background: result.success
              ? "#052e16"
              : "#450a0a",
            border: result.success
              ? "1px solid #16a34a"
              : "1px solid #dc2626",
            borderRadius: 12,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            {result.success
              ? "✅ İşlem Tamamlandı"
              : "❌ Hata"}
          </h2>

          {result.message && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {result.message}
            </pre>
          )}

          {result.error && (
            <p
              style={{
                color: "#fecaca",
                margin: 0,
              }}
            >
              {result.error}
            </p>
          )}

          {result.details &&
            result.details.errors.length > 0 && (
              <>
                <h3
                  style={{
                    marginTop: 24,
                  }}
                >
                  Atlanan Ürünler
                </h3>

                <ul
                  style={{
                    paddingLeft: 20,
                  }}
                >
                  {result.details.errors.map(
  (error: string, index: number) => (
    <li key={index}>
      {error}
    </li>
  ),
)}
                </ul>
              </>
            )}
        </section>
      )}

      <section
        style={{
          marginTop: 32,
          padding: 20,
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          JSON ile Ürün İçe Aktarma
        </h2>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 12,
            background: "#030712",
            color: "#f9fafb",
            border: "1px solid #374151",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 14,
            resize: "vertical",
          }}
        />

        <button
          onClick={handleJsonImport}
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "12px 18px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            fontSize: 16,
          }}
        >
          {loading
            ? "İşleniyor..."
            : "JSON'u İçe Aktar"}
        </button>
      </section>
    </main>
  );
}