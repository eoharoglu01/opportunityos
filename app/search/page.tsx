"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("query") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [status, setStatus] = useState(
    initialQuery ? "Ürünler aranıyor..." : "Aramak istediğiniz ürünü yazın.",
  );
  const [isLoading, setIsLoading] = useState(Boolean(initialQuery));

  useEffect(() => {
    const currentQuery = searchParams.get("query")?.trim() ?? "";

    setQuery(currentQuery);

    if (!currentQuery) {
      setResults([]);
      setStatus("Aramak istediğiniz ürünü yazın.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function searchProducts() {
      try {
        setIsLoading(true);
        setStatus("Ürünler ve market fiyatları aranıyor...");

        const response = await fetch(
          `/api/search?query=${encodeURIComponent(currentQuery)}`,
        );

        const result = (await response.json()) as SearchResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Arama sırasında hata oluştu.");
        }

        if (cancelled) return;

        const items = result.data ?? [];

        const sortedItems = [...items].sort(
          (a, b) => Number(a.price) - Number(b.price),
        );

        setResults(sortedItems);

        if (sortedItems.length === 0) {
          setStatus(`"${currentQuery}" için sonuç bulunamadı.`);
        } else {
          setStatus(
            `${sortedItems.length} market fiyatı bulundu.`,
          );
        }
      } catch (error) {
        console.error("Arama hatası:", error);

        if (cancelled) return;

        setResults([]);
        setStatus(
          error instanceof Error
            ? error.message
            : "Arama sırasında beklenmeyen bir hata oluştu.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void searchProducts();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      setResults([]);
      setStatus("Lütfen bir ürün adı veya barkod yazın.");
      return;
    }

    router.push(`/search?query=${encodeURIComponent(cleanedQuery)}`);
  }

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Opportunity[]>();

    for (const result of results) {
      const existing = groups.get(result.productName) ?? [];
      existing.push(result);
      groups.set(result.productName, existing);
    }

    return Array.from(groups.entries()).map(([productName, offers]) => {
      const sortedOffers = [...offers].sort(
        (a, b) => Number(a.price) - Number(b.price),
      );

      const cheapest = sortedOffers[0];
      const highestPrice = Math.max(
        ...sortedOffers.map((offer) => Number(offer.price)),
      );

      const cheapestPrice = Number(cheapest.price);

      return {
        productName,
        offers: sortedOffers,
        cheapest,
        totalSavings: highestPrice - cheapestPrice,
      };
    });
  }, [results]);

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
                boxShadow: "0 8px 25px rgba(34, 197, 94, 0.3)",
              }}
            >
              O
            </span>

            OpportunityOS
          </Link>

          <Link
            href="/scanner"
            style={{
              padding: "10px 14px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "11px",
              color: "#e2e8f0",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Barkod Tara
          </Link>
        </div>
      </header>

      <section
        style={{
          width: "min(1100px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "54px 0 70px",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            textAlign: "center",
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
            Fiyat karşılaştırma
          </p>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(34px, 6vw, 58px)",
              lineHeight: 1.08,
              letterSpacing: "-2px",
            }}
          >
            Ürünü ara, en iyi fiyatı bul
          </h1>

          <p
            style={{
              margin: "18px auto 0",
              maxWidth: "620px",
              color: "#cbd5e1",
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            Ürün adı veya barkod girerek farklı marketlerdeki fiyatları
            karşılaştır.
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "28px",
              padding: "8px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "18px",
              backgroundColor: "rgba(15, 23, 42, 0.78)",
              boxShadow: "0 22px 70px rgba(0, 0, 0, 0.3)",
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Örnek: Coca-Cola veya 5000112664867"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "16px 18px",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: "#ffffff",
                fontSize: "16px",
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "0 22px",
                border: "none",
                borderRadius: "12px",
                background: isLoading
                  ? "#475569"
                  : "linear-gradient(135deg, #22c55e, #14b8a6)",
                color: isLoading ? "#cbd5e1" : "#052e16",
                fontWeight: 900,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "Aranıyor..." : "Ara"}
            </button>
          </form>

          <p
            style={{
              minHeight: "24px",
              marginTop: "18px",
              color: "#94a3b8",
            }}
          >
            {status}
          </p>
        </div>

        {isLoading && (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "220px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                border: "4px solid rgba(148, 163, 184, 0.25)",
                borderTopColor: "#22c55e",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}

        {!isLoading && groupedProducts.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "22px",
              marginTop: "30px",
            }}
          >
            {groupedProducts.map((group) => (
              <section
                key={group.productName}
                style={{
                  overflow: "hidden",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  borderRadius: "22px",
                  backgroundColor: "rgba(15, 23, 42, 0.78)",
                  boxShadow: "0 18px 55px rgba(0, 0, 0, 0.22)",
                }}
              >
                <div
                  style={{
                    padding: "24px",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
                    background:
                      "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(20, 184, 166, 0.04))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "18px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          marginBottom: "10px",
                          padding: "5px 9px",
                          borderRadius: "999px",
                          backgroundColor: "#22c55e",
                          color: "#052e16",
                          fontSize: "12px",
                          fontWeight: 900,
                        }}
                      >
                        EN UCUZ
                      </div>

                      <h2
                        style={{
                          margin: 0,
                          fontSize: "27px",
                          letterSpacing: "-0.5px",
                        }}
                      >
                        {group.productName}
                      </h2>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#94a3b8",
                        }}
                      >
                        {group.offers.length} markette fiyat bulundu
                      </p>
                      <Link
  href={`/product/${encodeURIComponent(String(group.cheapest.id))}`}
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "18px",
    padding: "11px 16px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 900,
  }}
>
  Ürün Detayını Gör →
</Link>
                    </div>

                    <div
                      style={{
                        minWidth: "190px",
                        padding: "16px",
                        border: "1px solid rgba(34, 197, 94, 0.28)",
                        borderRadius: "16px",
                        backgroundColor: "rgba(5, 46, 22, 0.72)",
                      }}
                    >
                      <div
                        style={{
                          color: "#86efac",
                          fontSize: "13px",
                          fontWeight: 800,
                        }}
                      >
                        {group.cheapest.store}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "30px",
                          fontWeight: 900,
                        }}
                      >
                        {formatPrice(group.cheapest.price)} TL
                      </div>

                      {group.totalSavings > 0 && (
                        <div
                          style={{
                            marginTop: "7px",
                            color: "#86efac",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {formatPrice(group.totalSavings)} TL tasarruf
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    padding: "18px",
                  }}
                >
                  {group.offers.map((offer, index) => {
                    const cheapestPrice = Number(group.cheapest.price);
                    const difference = Number(offer.price) - cheapestPrice;
                    const isCheapest = index === 0;

                    return (
                      <article
                        key={`${offer.id}-${offer.store}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          padding: "16px",
                          border: isCheapest
                            ? "1px solid rgba(34, 197, 94, 0.38)"
                            : "1px solid rgba(148, 163, 184, 0.14)",
                          borderRadius: "14px",
                          backgroundColor: isCheapest
                            ? "rgba(5, 46, 22, 0.55)"
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
                              fontSize: "18px",
                              fontWeight: 800,
                            }}
                          >
                            {offer.store}

                            {isCheapest && (
                              <span
                                style={{
                                  padding: "3px 7px",
                                  borderRadius: "999px",
                                  backgroundColor: "#22c55e",
                                  color: "#052e16",
                                  fontSize: "10px",
                                  fontWeight: 900,
                                }}
                              >
                                EN İYİ FİYAT
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
                              ? "Bu ürün için en uygun market"
                              : `${formatPrice(difference)} TL daha pahalı`}
                          </div>
                        </div>

                        <div
                          style={{
                            whiteSpace: "nowrap",
                            fontSize: "22px",
                            fontWeight: 900,
                          }}
                        >
                          {formatPrice(offer.price)} TL
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {!isLoading &&
          initialQuery &&
          groupedProducts.length === 0 && (
            <div
              style={{
                maxWidth: "620px",
                margin: "36px auto 0",
                padding: "34px",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "20px",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "42px" }}>🔎</div>

              <h2
                style={{
                  margin: "14px 0 8px",
                }}
              >
                Sonuç bulunamadı
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  lineHeight: 1.65,
                }}
              >
                Ürün adını farklı yazarak veya barkodu doğrudan girerek
                tekrar deneyebilirsin.
              </p>

              <Link
                href="/scanner"
                style={{
                  display: "inline-block",
                  marginTop: "20px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Barkod Tara
              </Link>
            </div>
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