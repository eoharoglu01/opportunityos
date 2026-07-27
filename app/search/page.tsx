"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { favoriteService } from "../../src/services/favorites/FavoriteService";
import { alertService } from "../../src/services/AlertService";

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

function parseTargetPrice(value: string) {
  const normalizedValue = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  return Number(normalizedValue);
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

  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(
    new Set(),
  );

  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(
    null,
  );

  const [favoriteMessage, setFavoriteMessage] = useState("");

  const [targetPrices, setTargetPrices] = useState<Record<string, string>>({});

  const [alertLoadingId, setAlertLoadingId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      try {
        const favorites = await favoriteService.getFavorites();

        if (!active) {
          return;
        }

        setFavoriteProductIds(
          new Set(favorites.map((favorite) => favorite.product_id)),
        );
      } catch {
        // Kullanıcı giriş yapmamış olsa da arama sayfası çalışmaya devam eder.
      }
    }

    void loadFavorites();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
  const currentQuery =
    searchParams.get("query")?.trim() ?? "";

  let cancelled = false;

  async function searchProducts() {
    await Promise.resolve();

    if (cancelled) {
      return;
    }

    setQuery(currentQuery);
    setFavoriteMessage("");
    setAlertMessage("");
    setTargetPrices({});

    if (!currentQuery) {
      setResults([]);
      setStatus("Aramak istediğiniz ürünü yazın.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setStatus(
        "Ürünler ve market fiyatları aranıyor...",
      );

      const response = await fetch(
        `/api/search?query=${encodeURIComponent(
          currentQuery,
        )}`,
      );

      const result =
        (await response.json()) as SearchResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Arama sırasında hata oluştu.",
        );
      }

      if (cancelled) {
        return;
      }

      const sortedItems = [
        ...(result.data ?? []),
      ].sort(
        (a, b) =>
          Number(a.price) - Number(b.price),
      );

      setResults(sortedItems);
      setStatus(
        sortedItems.length === 0
          ? `"${currentQuery}" için sonuç bulunamadı.`
          : `${sortedItems.length} market fiyatı bulundu.`,
      );
    } catch (error: unknown) {
      console.error("Arama hatası:", error);

      if (cancelled) {
        return;
      }

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

  async function handleToggleFavorite(opportunity: Opportunity) {
    const productId = String(opportunity.id);
    const isFavorite = favoriteProductIds.has(productId);

    setFavoriteLoadingId(productId);
    setFavoriteMessage("");
    setAlertMessage("");

    try {
      if (isFavorite) {
        await favoriteService.removeFavorite(productId);

        setFavoriteProductIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(productId);
          return nextIds;
        });

        setFavoriteMessage("Ürün favorilerden kaldırıldı.");
      } else {
        await favoriteService.addFavorite({
          productId,
          productName: opportunity.productName,
          store: opportunity.store,
          price: Number(opportunity.price),
        });

        setFavoriteProductIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.add(productId);
          return nextIds;
        });

        setFavoriteMessage("Ürün favorilerine eklendi.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Favori işlemi sırasında bir hata oluştu.";

      if (message.toLocaleLowerCase("tr-TR").includes("giriş")) {
        router.push("/login");
        return;
      }

      setFavoriteMessage(message);
    } finally {
      setFavoriteLoadingId(null);
    }
  }

  async function handleCreateAlert(opportunity: Opportunity) {
    const productId = String(opportunity.id);
    const targetPriceText = targetPrices[productId] ?? "";
    const targetPrice = parseTargetPrice(targetPriceText);
    const currentPrice = Number(opportunity.price);

    setFavoriteMessage("");
    setAlertMessage("");

    if (!targetPriceText.trim()) {
      setAlertMessage("Lütfen hedef fiyatı girin.");
      return;
    }

    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      setAlertMessage("Hedef fiyat geçerli ve sıfırdan büyük olmalıdır.");
      return;
    }

    setAlertLoadingId(productId);

    try {
      await alertService.createAlert({
        productId,
        productName: opportunity.productName,
        store: opportunity.store,
        currentPrice,
        targetPrice,
      });

      setAlertMessage(
        `${opportunity.productName} için ${formatPrice(
          targetPrice,
        )} TL hedef fiyat alarmı oluşturuldu.`,
      );

      setTargetPrices((currentPrices) => ({
        ...currentPrices,
        [productId]: "",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fiyat alarmı oluşturulurken bir hata oluştu.";

      if (message.toLocaleLowerCase("tr-TR").includes("giriş")) {
        router.push("/login");
        return;
      }

      setAlertMessage(message);
    } finally {
      setAlertLoadingId(null);
    }
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <Link
              href="/alerts"
              style={{
                padding: "10px 14px",
                border: "1px solid rgba(250, 204, 21, 0.35)",
                borderRadius: "11px",
                color: "#fde68a",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              🔔 Alarmlarım
            </Link>

            <Link
              href="/favorites"
              style={{
                padding: "10px 14px",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                borderRadius: "11px",
                color: "#fecaca",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              ❤️ Favorilerim
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

          {favoriteMessage && (
            <p
              role="status"
              style={{
                margin: "8px 0 0",
                color: favoriteMessage.toLocaleLowerCase("tr-TR").includes(
                  "hata",
                )
                  ? "#fca5a5"
                  : "#86efac",
                fontWeight: 700,
              }}
            >
              {favoriteMessage}
            </p>
          )}

          {alertMessage && (
            <p
              role="status"
              style={{
                margin: "8px 0 0",
                color:
                  alertMessage.toLocaleLowerCase("tr-TR").includes("hata") ||
                  alertMessage
                    .toLocaleLowerCase("tr-TR")
                    .includes("geçerli") ||
                  alertMessage.toLocaleLowerCase("tr-TR").includes("lütfen")
                    ? "#fca5a5"
                    : "#fde68a",
                fontWeight: 700,
              }}
            >
              {alertMessage}
            </p>
          )}
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
            {groupedProducts.map((group) => {
              const cheapestProductId = String(group.cheapest.id);

              const isFavorite =
                favoriteProductIds.has(cheapestProductId);

              const isFavoriteLoading =
                favoriteLoadingId === cheapestProductId;

              const isAlertLoading =
                alertLoadingId === cheapestProductId;

              const targetPrice =
                targetPrices[cheapestProductId] ?? "";

              return (
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
                      borderBottom:
                        "1px solid rgba(148, 163, 184, 0.14)",
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
                      <div style={{ flex: "1 1 500px" }}>
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "18px",
                          }}
                        >
                          <Link
                            href={`/product/${encodeURIComponent(
                              cheapestProductId,
                            )}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "11px 16px",
                              border:
                                "1px solid rgba(255, 255, 255, 0.18)",
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

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleFavorite(group.cheapest)
                            }
                            disabled={isFavoriteLoading}
                            style={{
                              padding: "11px 16px",
                              border: isFavorite
                                ? "1px solid rgba(248, 113, 113, 0.55)"
                                : "1px solid rgba(148, 163, 184, 0.3)",
                              borderRadius: "12px",
                              backgroundColor: isFavorite
                                ? "rgba(127, 29, 29, 0.55)"
                                : "rgba(15, 23, 42, 0.8)",
                              color: isFavorite
                                ? "#fecaca"
                                : "#e2e8f0",
                              fontSize: "14px",
                              fontWeight: 900,
                              cursor: isFavoriteLoading
                                ? "wait"
                                : "pointer",
                              opacity: isFavoriteLoading ? 0.7 : 1,
                            }}
                          >
                            {isFavoriteLoading
                              ? "İşleniyor..."
                              : isFavorite
                                ? "❤️ Favoride"
                                : "🤍 Favoriye Ekle"}
                          </button>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "stretch",
                            flexWrap: "wrap",
                            gap: "10px",
                            maxWidth: "470px",
                            marginTop: "16px",
                            padding: "12px",
                            border:
                              "1px solid rgba(250, 204, 21, 0.22)",
                            borderRadius: "14px",
                            backgroundColor: "rgba(113, 63, 18, 0.18)",
                          }}
                        >
                          <div
                            style={{
                              flex: "1 1 180px",
                              minWidth: 0,
                            }}
                          >
                            <label
                              htmlFor={`target-price-${cheapestProductId}`}
                              style={{
                                display: "block",
                                marginBottom: "7px",
                                color: "#fde68a",
                                fontSize: "12px",
                                fontWeight: 800,
                              }}
                            >
                              Hedef fiyat
                            </label>

                            <input
                              id={`target-price-${cheapestProductId}`}
                              type="text"
                              inputMode="decimal"
                              value={targetPrice}
                              onChange={(event) => {
                                const value = event.target.value;

                                setTargetPrices((currentPrices) => ({
                                  ...currentPrices,
                                  [cheapestProductId]: value,
                                }));

                                setAlertMessage("");
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();

                                  void handleCreateAlert(group.cheapest);
                                }
                              }}
                              placeholder={`Örnek: ${formatPrice(
                                Math.max(
                                  Number(group.cheapest.price) * 0.9,
                                  0.01,
                                ),
                              )}`}
                              disabled={isAlertLoading}
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "11px 12px",
                                border:
                                  "1px solid rgba(250, 204, 21, 0.3)",
                                borderRadius: "10px",
                                outline: "none",
                                backgroundColor: "rgba(2, 6, 23, 0.68)",
                                color: "#ffffff",
                                fontSize: "14px",
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCreateAlert(group.cheapest)
                            }
                            disabled={isAlertLoading}
                            style={{
                              alignSelf: "flex-end",
                              minHeight: "42px",
                              padding: "10px 16px",
                              border:
                                "1px solid rgba(250, 204, 21, 0.45)",
                              borderRadius: "10px",
                              backgroundColor: isAlertLoading
                                ? "rgba(71, 85, 105, 0.8)"
                                : "rgba(161, 98, 7, 0.58)",
                              color: isAlertLoading
                                ? "#cbd5e1"
                                : "#fef3c7",
                              fontSize: "14px",
                              fontWeight: 900,
                              cursor: isAlertLoading
                                ? "wait"
                                : "pointer",
                            }}
                          >
                            {isAlertLoading
                              ? "Oluşturuluyor..."
                              : "🔔 Alarm Kur"}
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: "190px",
                          padding: "16px",
                          border:
                            "1px solid rgba(34, 197, 94, 0.28)",
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
                      const cheapestPrice = Number(
                        group.cheapest.price,
                      );

                      const difference =
                        Number(offer.price) - cheapestPrice;

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
                                color: isCheapest
                                  ? "#86efac"
                                  : "#94a3b8",
                                fontSize: "14px",
                              }}
                            >
                              {isCheapest
                                ? "Bu ürün için en uygun market"
                                : `${formatPrice(
                                    difference,
                                  )} TL daha pahalı`}
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
              );
            })}
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