"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ProductPriceHistory from "../../../components/ProductPriceHistory";
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

type OpenFoodFactsResponse = {
  status?: number;
  product?: {
    image_front_url?: string;
    image_url?: string;
  };
};

function formatPrice(value: string | number) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductDetailPage() {
  const params = useParams<{ barcode: string }>();
  const barcode = params.barcode;

  const [offers, setOffers] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

useEffect(() => {
  const controller = new AbortController();

  async function loadProduct() {
    await Promise.resolve();

    if (!barcode) {
      setOffers([]);
      setIsLoading(false);
      setErrorMessage(
        "Geçerli bir barkod bulunamadı.",
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/search?query=${encodeURIComponent(
          barcode,
        )}`,
        {
          signal: controller.signal,
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as SearchResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Ürün bilgileri yüklenirken hata oluştu.",
        );
      }

      const sortedOffers = [
        ...(result.data ?? []),
      ].sort(
        (a, b) =>
          Number(a.price) - Number(b.price),
      );

      setOffers(sortedOffers);

      if (sortedOffers.length === 0) {
        setErrorMessage(
          "Bu barkoda ait ürün veya fiyat bulunamadı.",
        );
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Ürün detayı yükleme hatası:",
        error,
      );

      setOffers([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ürün bilgileri yüklenirken beklenmeyen bir hata oluştu.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }

  void loadProduct();

  return () => {
    controller.abort();
  };
}, [barcode]);

  useEffect(() => {
  const controller = new AbortController();

  async function loadProductImage() {
    await Promise.resolve();

    if (!barcode || controller.signal.aborted) {
      return;
    }

    setProductImageUrl("");
    setImageFailed(false);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
          barcode,
        )}.json?fields=image_front_url,image_url`,
        {
          signal: controller.signal,
        },
      );

      if (!response.ok || controller.signal.aborted) {
        return;
      }

      const result =
        (await response.json()) as OpenFoodFactsResponse;

      const imageUrl =
        result.product?.image_front_url ??
        result.product?.image_url ??
        "";

      if (!controller.signal.aborted) {
        setProductImageUrl(imageUrl);
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Ürün görseli yükleme hatası:",
        error,
      );
    }
  }

  void loadProductImage();

  return () => {
    controller.abort();
  };
}, [barcode]);

  const productSummary = useMemo(() => {
    if (offers.length === 0) return null;

    const cheapestOffer = offers[0];
    const cheapestPrice = Number(cheapestOffer.price);
    const highestPrice = Math.max(
      ...offers.map((offer) => Number(offer.price)),
    );

    return {
      productName: cheapestOffer.productName,
      cheapestOffer,
      cheapestPrice,
      highestPrice,
      totalSavings: highestPrice - cheapestPrice,
    };
  }, [offers]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #172554 0%, #0f172a 38%, #020617 100%)",
        color: "#f8fafc",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
          backgroundColor: "rgba(2, 6, 23, 0.84)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            width: "min(1100px, calc(100% - 32px))",
            minHeight: "72px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "20px",
              fontWeight: 900,
            }}
          >
            <span
              style={{
                width: "38px",
                height: "38px",
                display: "grid",
                placeItems: "center",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #22c55e, #14b8a6)",
                color: "#052e16",
              }}
            >
              O
            </span>

            OpportunityOS
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Link
              href="/search"
              style={{
                padding: "10px 14px",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "11px",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Ürün Ara
            </Link>

            <Link
              href="/scanner"
              style={{
                padding: "10px 14px",
                borderRadius: "11px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Barkod Tara
            </Link>
          </div>
        </div>
      </header>

      <section
        style={{
          width: "min(1100px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "42px 0 70px",
        }}
      >
        <Link
          href={`/search?query=${encodeURIComponent(barcode ?? "")}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "24px",
            color: "#94a3b8",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Arama sonuçlarına dön
        </Link>

        {isLoading && (
          <div
            style={{
              minHeight: "420px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  margin: "0 auto",
                  border: "4px solid rgba(148, 163, 184, 0.22)",
                  borderTopColor: "#22c55e",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />

              <p
                style={{
                  marginTop: "18px",
                  color: "#94a3b8",
                }}
              >
                Ürün bilgileri yükleniyor...
              </p>
            </div>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div
            style={{
              maxWidth: "650px",
              margin: "60px auto 0",
              padding: "34px",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: "22px",
              backgroundColor: "rgba(15, 23, 42, 0.78)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "46px" }}>🔎</div>

            <h1 style={{ margin: "16px 0 8px" }}>Ürün bulunamadı</h1>

            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                lineHeight: 1.7,
              }}
            >
              {errorMessage}
            </p>

            <Link
              href="/scanner"
              style={{
                display: "inline-block",
                marginTop: "22px",
                padding: "13px 18px",
                borderRadius: "12px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Yeni barkod okut
            </Link>
          </div>
        )}

        {!isLoading && productSummary && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "22px",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  minHeight: "310px",
                  display: "grid",
                  placeItems: "center",
                  padding: "28px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(145deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.76))",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "220px",
                      height: "220px",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto",
                      overflow: "hidden",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "28px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 20px 45px rgba(0, 0, 0, 0.22)",
                    }}
                  >
                    {productImageUrl && !imageFailed ? (
                      <img
                        src={productImageUrl}
                        alt={`${productSummary.productName} ürün görseli`}
                        onError={() => setImageFailed(true)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          padding: "14px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          background:
                            "linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(37, 99, 235, 0.18))",
                          color: "#0f172a",
                          fontSize: "72px",
                        }}
                      >
                        🥤
                      </div>
                    )}
                  </div>

                  <p
                    style={{
                      margin: "24px 0 0",
                      color: "#94a3b8",
                      fontSize: "14px",
                    }}
                  >
                    Barkod
                  </p>

                  <div
                    style={{
                      marginTop: "5px",
                      fontFamily: "monospace",
                      fontSize: "17px",
                      fontWeight: 800,
                    }}
                  >
                    {barcode}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "30px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  borderRadius: "24px",
                  backgroundColor: "rgba(15, 23, 42, 0.8)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#4ade80",
                    fontSize: "13px",
                    fontWeight: 900,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Ürün detayı
                </p>

                <h1
                  style={{
                    margin: "10px 0 0",
                    fontSize: "clamp(32px, 5vw, 48px)",
                    lineHeight: 1.08,
                    letterSpacing: "-1.8px",
                  }}
                >
                  {productSummary.productName}
                </h1>

                <p
                  style={{
                    margin: "16px 0 0",
                    color: "#94a3b8",
                    lineHeight: 1.7,
                  }}
                >
                  {offers.length} markette bulunan fiyatlar karşılaştırıldı.
                  En uygun seçenek aşağıda gösteriliyor.
                </p>

                <div
                  style={{
                    marginTop: "26px",
                    padding: "20px",
                    border: "1px solid rgba(34, 197, 94, 0.32)",
                    borderRadius: "18px",
                    backgroundColor: "rgba(5, 46, 22, 0.7)",
                  }}
                >
                  <div
                    style={{
                      color: "#86efac",
                      fontSize: "13px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    En ucuz market
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "16px",
                      marginTop: "10px",
                    }}
                  >
                    <div style={{ fontSize: "26px", fontWeight: 900 }}>
                      {productSummary.cheapestOffer.store}
                    </div>

                    <div style={{ fontSize: "38px", fontWeight: 950 }}>
                      {formatPrice(productSummary.cheapestPrice)} TL
                    </div>
                  </div>

                  {productSummary.totalSavings > 0 && (
                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "#86efac",
                        fontWeight: 800,
                      }}
                    >
                      En pahalı markete göre{" "}
                      {formatPrice(productSummary.totalSavings)} TL tasarruf
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFavorite((current) => !current)}
                  style={{
                    width: "100%",
                    marginTop: "18px",
                    padding: "14px 18px",
                    border: isFavorite
                      ? "1px solid rgba(244, 63, 94, 0.5)"
                      : "1px solid rgba(148, 163, 184, 0.24)",
                    borderRadius: "13px",
                    backgroundColor: isFavorite
                      ? "rgba(136, 19, 55, 0.5)"
                      : "rgba(2, 6, 23, 0.48)",
                    color: isFavorite ? "#fda4af" : "#e2e8f0",
                    fontSize: "16px",
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {isFavorite
                    ? "♥️ Favorilere eklendi"
                    : "♡ Favorilere ekle"}
                </button>
              </div>
            </section>

            <section
              style={{
                marginTop: "24px",
                padding: "24px",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "24px",
                backgroundColor: "rgba(15, 23, 42, 0.78)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#4ade80",
                      fontSize: "13px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Market karşılaştırması
                  </p>

                  <h2 style={{ margin: "8px 0 0", fontSize: "28px" }}>
                    Güncel fiyatlar
                  </h2>
                </div>

                <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                  En düşükten en yükseğe sıralandı
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "11px",
                  marginTop: "22px",
                }}
              >
                {offers.map((offer, index) => {
                  const difference =
                    Number(offer.price) - productSummary.cheapestPrice;
                  const isCheapest = index === 0;

                  return (
                    <article
                      key={`${offer.id}-${offer.store}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "18px",
                        padding: "18px",
                        border: isCheapest
                          ? "1px solid rgba(34, 197, 94, 0.42)"
                          : "1px solid rgba(148, 163, 184, 0.14)",
                        borderRadius: "15px",
                        backgroundColor: isCheapest
                          ? "rgba(5, 46, 22, 0.58)"
                          : "rgba(2, 6, 23, 0.45)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                            fontSize: "19px",
                            fontWeight: 900,
                          }}
                        >
                          {offer.store}

                          {isCheapest && (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                backgroundColor: "#22c55e",
                                color: "#052e16",
                                fontSize: "10px",
                                fontWeight: 950,
                              }}
                            >
                              EN UCUZ
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: "5px",
                            color: isCheapest ? "#86efac" : "#94a3b8",
                            fontSize: "14px",
                          }}
                        >
                          {isCheapest
                            ? "Bu ürün için en iyi fiyat"
                            : `${formatPrice(difference)} TL daha pahalı`}
                        </div>
                      </div>

                      <div
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: "24px",
                          fontWeight: 950,
                        }}
                      >
                        {formatPrice(offer.price)} TL
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                marginTop: "24px",
                padding: "24px",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "24px",
                backgroundColor: "rgba(15, 23, 42, 0.78)",
              }}
            >
             
 
              <ProductPriceHistory barcode={barcode} />
            </section>
          </>
        )}
      </section>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
