"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

type Opportunity = {
  id: number | string;
  productName: string;
  store: string;
  price: string | number;
  savings: string | number;
  badge: string;
  description: string;
};

type SearchResponse = {
  success: boolean;
  data?: Opportunity[];
  error?: string;
};

function formatPrice(value: string | number) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [products, setProducts] = useState<Opportunity[]>([]);
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState("Barkodu kameraya gösterin.");
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning) return;

    const hints = new Map<DecodeHintType, unknown>();

    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ]);

    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    let controls: { stop: () => void } | undefined;
    let found = false;
    let isMounted = true;

    async function searchBarcode(code: string) {
      try {
        setStatus("Ürün ve fiyatlar aranıyor...");

        const response = await fetch(
          `/api/search?query=${encodeURIComponent(code)}`,
        );

        const result = (await response.json()) as SearchResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Ürün aranırken hata oluştu.");
        }

        if (!isMounted) return;

        const items = result.data ?? [];

        if (items.length === 0) {
          setProducts([]);
          setStatus("Bu barkoda ait ürün veya fiyat bulunamadı.");
          setIsScanning(false);
          return;
        }

        const sortedItems = [...items].sort(
          (a, b) => Number(a.price) - Number(b.price),
        );

        setProducts(sortedItems);
        setStatus(`${sortedItems.length} market fiyatı bulundu.`);
        setIsScanning(false);
      } catch (error) {
        console.error("Barkod arama hatası:", error);

        if (!isMounted) return;

        setProducts([]);
        setStatus(
          error instanceof Error
            ? error.message
            : "Ürün aranırken beklenmeyen bir hata oluştu.",
        );
        setIsScanning(false);
      }
    }

    async function startCamera() {
      try {
        if (!videoRef.current) return;

        setStatus("Barkodu kameraya gösterin.");

        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || found) return;

            found = true;

            const code = result.getText();

            setBarcode(code);
            controls?.stop();

            void searchBarcode(code);
          },
        );
      } catch (error) {
        console.error("Kamera açılamadı:", error);

        if (!isMounted) return;

        setStatus(
          "Kamera açılamadı. Kamera iznini ve HTTPS bağlantısını kontrol edin.",
        );
        setIsScanning(false);
      }
    }

    void startCamera();

    const videoElement = videoRef.current;

    return () => {
      isMounted = false;
      controls?.stop();

      const stream = videoElement?.srcObject;

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanning]);

  function scanAgain() {
    setProducts([]);
    setBarcode("");
    setStatus("Kamera hazırlanıyor...");
    setIsScanning(true);
  }

  const cheapestProduct = products[0];

  const cheapestPrice = cheapestProduct
    ? Number(cheapestProduct.price)
    : 0;

  const highestPrice =
    products.length > 0
      ? Math.max(...products.map((product) => Number(product.price)))
      : 0;

  const totalSavings = highestPrice - cheapestPrice;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#111827",
        color: "#ffffff",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          Barkod Tarayıcı
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: "20px",
            color: "#cbd5e1",
            textAlign: "center",
          }}
        >
          {status}
        </p>

        {isScanning && (
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: "2px solid #374151",
              borderRadius: "16px",
              backgroundColor: "#000000",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                display: "block",
                width: "100%",
                maxHeight: "420px",
                objectFit: "cover",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "10%",
                right: "10%",
                height: "2px",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 10px #ef4444",
              }}
            />
          </div>
        )}

        {barcode && (
          <p
            style={{
              marginTop: "16px",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Okunan barkod: <strong>{barcode}</strong>
          </p>
        )}

        {cheapestProduct && (
          <section style={{ marginTop: "24px" }}>
            <h2
              style={{
                marginBottom: "6px",
                textAlign: "center",
              }}
            >
              {cheapestProduct.productName}
            </h2>

            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                border: "2px solid #22c55e",
                borderRadius: "16px",
                backgroundColor: "#052e16",
                boxShadow: "0 10px 30px rgba(34, 197, 94, 0.15)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  marginBottom: "10px",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  backgroundColor: "#22c55e",
                  color: "#052e16",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                En ucuz fiyat
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                {cheapestProduct.store}
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "34px",
                  fontWeight: 800,
                }}
              >
                {formatPrice(cheapestProduct.price)} TL
              </div>

              {totalSavings > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    color: "#86efac",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  En pahalı markete göre {formatPrice(totalSavings)} TL
                  tasarruf
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {products.map((product, index) => {
                const productPrice = Number(product.price);
                const difference = productPrice - cheapestPrice;
                const isCheapest = index === 0;

                return (
                  <article
                    key={`${product.id}-${product.store}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      padding: "16px",
                      border: isCheapest
                        ? "1px solid #22c55e"
                        : "1px solid #374151",
                      borderRadius: "14px",
                      backgroundColor: isCheapest
                        ? "#052e16"
                        : "#1f2937",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "18px",
                          fontWeight: 700,
                        }}
                      >
                        {product.store}

                        {isCheapest && (
                          <span
                            style={{
                              padding: "3px 7px",
                              borderRadius: "999px",
                              backgroundColor: "#22c55e",
                              color: "#052e16",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            EN UCUZ
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          color: isCheapest ? "#86efac" : "#94a3b8",
                          fontSize: "14px",
                        }}
                      >
                        {isCheapest
                          ? "En iyi fiyat"
                          : `${formatPrice(difference)} TL daha pahalı`}
                      </div>
                    </div>

                    <div
                      style={{
                        whiteSpace: "nowrap",
                        fontSize: "22px",
                        fontWeight: 800,
                      }}
                    >
                      {formatPrice(product.price)} TL
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!isScanning && (
          <button
            type="button"
            onClick={scanAgain}
            style={{
              display: "block",
              width: "100%",
              marginTop: "24px",
              padding: "14px 18px",
              border: "none",
              borderRadius: "12px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Yeni barkod okut
          </button>
        )}
      </div>
    </main>
  );
}