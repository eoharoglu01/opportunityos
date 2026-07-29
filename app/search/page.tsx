"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { alertService } from "../../src/services/AlertService";
import { favoriteService } from "../../src/services/favorites/FavoriteService";

type CatalogOffer = {
  storeName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  price: number;
  currency: string;
  sourceUrl: string;
  collectedAt: string;
  rank?: number;
  badge?: string | null;
  isCheapest?: boolean;
  priceDifference?: number;
  priceDifferencePercentage?: number;
};

type CatalogProductGroup = {
  normalizedName: string;
  productName: string;
  badge?: string;
  cheapestOffer: CatalogOffer;
  cheapestPrice: number;
  highestPrice: number;
  maximumSavings: number;
  savingsPercentage: number;
  offerCount: number;
  storeCount: number;
  isComparable: boolean;
  offers: CatalogOffer[];
};

type CatalogSummary = {
  totalMarkets: number;
  successfulMarkets: number;
  failedMarkets: number;
  totalProducts: number;
  totalProductGroups: number;
  comparableProductGroups: number;
  totalPotentialSavings: number;
  currency: string;
};

type SearchApiProduct = {
  id: number | string;
  productName: string;
  store: string;
  price: string | number;
  savings?: string | number;
  badge?: string;
  description?: string;
};

type SearchApiResponse = {
  success: boolean;
  data?: SearchApiProduct[];
  error?: string;
};

function formatPrice(
  value: string | number,
): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0,00";
  }

  return numericValue.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseTargetPrice(value: string): number {
  const normalizedValue = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(normalizedValue);
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function getStoreUrl(storeName: string): string {
  const normalizedStore =
    normalizeSearchText(storeName);

  const storeUrls: Record<string, string> = {
    a101: "https://www.a101.com.tr/",
    bim: "https://www.bim.com.tr/",
    sok: "https://www.sokmarket.com.tr/",
    migros: "https://www.migros.com.tr/",
    carrefoursa: "https://www.carrefoursa.com/",
    "tarim kredi": "https://www.tkkoperatif.com.tr/",
    "happy center": "https://www.happycenter.com.tr/",
    "bizim toptan": "https://www.bizimtoptan.com.tr/",
    "hakmar express":
      "https://www.hakmarexpress.com.tr/",
    "onur market":
      "https://www.onurmarket.com/",
    "kim market":
      "https://www.kimmarket.com/",
  };

  return storeUrls[normalizedStore] ?? "/";
}

function convertSearchProductsToGroups(
  products: SearchApiProduct[],
): CatalogProductGroup[] {
  const groupMap = new Map<
    string,
    CatalogOffer[]
  >();

  for (const product of products) {
    const price = Number(product.price);

    if (
      !product.productName?.trim() ||
      !product.store?.trim() ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    const normalizedName =
      normalizeSearchText(product.productName);

    if (!normalizedName) {
      continue;
    }

    const offer: CatalogOffer = {
      storeName: product.store.trim(),
      productName: product.productName.trim(),
      price,
      currency: "TRY",
      sourceUrl: getStoreUrl(product.store),
      collectedAt: new Date().toISOString(),
      badge: product.badge ?? null,
    };

    const existingOffers =
      groupMap.get(normalizedName) ?? [];

    existingOffers.push(offer);
    groupMap.set(normalizedName, existingOffers);
  }

  return Array.from(groupMap.entries())
    .map(([normalizedName, rawOffers]) => {
      const offers = [...rawOffers].sort(
        (firstOffer, secondOffer) =>
          firstOffer.price -
          secondOffer.price,
      );

      const cheapestPrice =
        offers[0]?.price ?? 0;

      const highestPrice =
        offers.at(-1)?.price ??
        cheapestPrice;

      const maximumSavings = Math.max(
        highestPrice - cheapestPrice,
        0,
      );

      const storeCount = new Set(
        offers.map((offer) =>
          normalizeSearchText(
            offer.storeName,
          ),
        ),
      ).size;

      const preparedOffers =
        offers.map((offer, index) => {
          const priceDifference =
            Math.max(
              offer.price -
                cheapestPrice,
              0,
            );

          const priceDifferencePercentage =
            cheapestPrice > 0
              ? Number(
                  (
                    (priceDifference /
                      cheapestPrice) *
                    100
                  ).toFixed(2),
                )
              : 0;

          return {
            ...offer,
            rank: index + 1,
            isCheapest: index === 0,
            priceDifference,
            priceDifferencePercentage,
          };
        });

      const cheapestOffer =
        preparedOffers[0];

      return {
        normalizedName,
        productName:
          cheapestOffer.productName,
        badge:
          cheapestOffer.badge ??
          undefined,
        cheapestOffer,
        cheapestPrice,
        highestPrice,
        maximumSavings,
        savingsPercentage:
          highestPrice > 0
            ? Number(
                (
                  (maximumSavings /
                    highestPrice) *
                  100
                ).toFixed(2),
              )
            : 0,
        offerCount:
          preparedOffers.length,
        storeCount,
        isComparable:
          storeCount > 1,
        offers: preparedOffers,
      };
    })
    .sort(
      (firstGroup, secondGroup) => {
        if (
          firstGroup.isComparable !==
          secondGroup.isComparable
        ) {
          return firstGroup.isComparable
            ? -1
            : 1;
        }

        if (
          secondGroup.maximumSavings !==
          firstGroup.maximumSavings
        ) {
          return (
            secondGroup.maximumSavings -
            firstGroup.maximumSavings
          );
        }

        return (
          firstGroup.cheapestPrice -
          secondGroup.cheapestPrice
        );
      },
    );
}
function createProductId(
  group: CatalogProductGroup,
): string {
  const input = [
    group.normalizedName,
    group.cheapestOffer.storeName,
    group.cheapestOffer.sourceUrl,
  ].join("|");

  let hash = 0;

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    hash =
      (hash * 31 + input.charCodeAt(index)) |
      0;
  }

  return `catalog-${Math.abs(hash)}`;
}

function getOfferDifference(
  offer: CatalogOffer,
  cheapestPrice: number,
): number {
  if (
    typeof offer.priceDifference === "number"
  ) {
    return Math.max(
      offer.priceDifference,
      0,
    );
  }

  return Math.max(
    Number(offer.price) - cheapestPrice,
    0,
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery =
    searchParams.get("query")?.trim() ?? "";

  const [query, setQuery] =
    useState(currentQuery);

  const [groups, setGroups] = useState<
    CatalogProductGroup[]
  >([]);

  const [summary, setSummary] =
    useState<CatalogSummary | null>(null);

  const [status, setStatus] = useState(
    currentQuery
      ? "Market fiyatları aranıyor..."
      : "Aramak istediğiniz ürünü yazın.",
  );

  const [isLoading, setIsLoading] =
    useState(Boolean(currentQuery));

  const [
    favoriteProductIds,
    setFavoriteProductIds,
  ] = useState<Set<string>>(new Set());

  const [
    favoriteLoadingId,
    setFavoriteLoadingId,
  ] = useState<string | null>(null);

  const [
    favoriteMessage,
    setFavoriteMessage,
  ] = useState("");

  const [targetPrices, setTargetPrices] =
    useState<Record<string, string>>({});

  const [
    alertLoadingId,
    setAlertLoadingId,
  ] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      try {
        const favorites =
          await favoriteService.getFavorites();

        if (!active) {
          return;
        }

        setFavoriteProductIds(
          new Set(
            favorites.map(
              (favorite) =>
                favorite.product_id,
            ),
          ),
        );
      } catch {
        // Giriş yapılmamış olsa da arama çalışmaya devam eder.
      }
    }

    void loadFavorites();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

async function searchCatalog() {
  setQuery(currentQuery);
  setFavoriteMessage("");
  setAlertMessage("");
  setTargetPrices({});

  if (!currentQuery) {
    setGroups([]);
    setSummary(null);
    setStatus(
      "Aramak istediğiniz ürünü yazın.",
    );
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    setStatus(
      "Kayıtlı market fiyatları aranıyor...",
    );

    const response = await fetch(
      `/api/search?query=${encodeURIComponent(
        currentQuery,
      )}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const result =
      (await response.json()) as SearchApiResponse;

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
          "Market fiyatları alınamadı.",
      );
    }

    if (cancelled) {
      return;
    }

    const products = Array.isArray(
      result.data,
    )
      ? result.data
      : [];

    const convertedGroups =
      convertSearchProductsToGroups(
        products,
      );

    const marketNames = new Set(
      products
        .map((product) =>
          product.store?.trim(),
        )
        .filter(
          (
            storeName,
          ): storeName is string =>
            Boolean(storeName),
        ),
    );

    const comparableProductGroups =
      convertedGroups.filter(
        (group) =>
          group.isComparable,
      ).length;

    const totalPotentialSavings =
      convertedGroups.reduce(
        (total, group) =>
          total +
          group.maximumSavings,
        0,
      );

    const nextSummary: CatalogSummary = {
      totalMarkets: marketNames.size,
      successfulMarkets:
        marketNames.size,
      failedMarkets: 0,
      totalProducts: products.length,
      totalProductGroups:
        convertedGroups.length,
      comparableProductGroups,
      totalPotentialSavings,
      currency: "TRY",
    };

    setGroups(convertedGroups);
    setSummary(nextSummary);

    const totalOfferCount =
      convertedGroups.reduce(
        (total, group) =>
          total +
          group.offers.length,
        0,
      );

    setStatus(
      convertedGroups.length === 0
        ? `"${currentQuery}" için sonuç bulunamadı.`
        : `${convertedGroups.length} ürün grubu ve ${totalOfferCount} market fiyatı bulundu.`,
    );
  } catch (error: unknown) {
    console.error(
      "Katalog arama hatası:",
      error,
    );

    if (cancelled) {
      return;
    }

    setGroups([]);
    setSummary(null);

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

    void searchCatalog();

    return () => {
      cancelled = true;
    };
  }, [currentQuery]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      setGroups([]);
      setStatus(
        "Lütfen bir ürün adı veya barkod yazın.",
      );
      return;
    }

    router.push(
      `/search?query=${encodeURIComponent(
        cleanedQuery,
      )}`,
    );
  }

  async function handleToggleFavorite(
    group: CatalogProductGroup,
  ) {
    const productId = createProductId(group);
    const isFavorite =
      favoriteProductIds.has(productId);

    setFavoriteLoadingId(productId);
    setFavoriteMessage("");
    setAlertMessage("");

    try {
      if (isFavorite) {
        await favoriteService.removeFavorite(
          productId,
        );

        setFavoriteProductIds(
          (currentIds) => {
            const nextIds =
              new Set(currentIds);

            nextIds.delete(productId);

            return nextIds;
          },
        );

        setFavoriteMessage(
          "Ürün favorilerden kaldırıldı.",
        );
      } else {
        await favoriteService.addFavorite({
          productId,
          productName: group.productName,
          store:
            group.cheapestOffer.storeName,
          price:
            group.cheapestOffer.price,
        });

        setFavoriteProductIds(
          (currentIds) => {
            const nextIds =
              new Set(currentIds);

            nextIds.add(productId);

            return nextIds;
          },
        );

        setFavoriteMessage(
          "Ürün favorilerine eklendi.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Favori işlemi sırasında bir hata oluştu.";

      if (
        message
          .toLocaleLowerCase("tr-TR")
          .includes("giriş")
      ) {
        router.push("/login");
        return;
      }

      setFavoriteMessage(message);
    } finally {
      setFavoriteLoadingId(null);
    }
  }

  async function handleCreateAlert(
    group: CatalogProductGroup,
  ) {
    const productId = createProductId(group);

    const targetPriceText =
      targetPrices[productId] ?? "";

    const targetPrice =
      parseTargetPrice(targetPriceText);

    const currentPrice =
      group.cheapestOffer.price;

    setFavoriteMessage("");
    setAlertMessage("");

    if (!targetPriceText.trim()) {
      setAlertMessage(
        "Lütfen hedef fiyatı girin.",
      );
      return;
    }

    if (
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      setAlertMessage(
        "Hedef fiyat geçerli ve sıfırdan büyük olmalıdır.",
      );
      return;
    }

    setAlertLoadingId(productId);

    try {
      await alertService.createAlert({
        productId,
        productName: group.productName,
        store:
          group.cheapestOffer.storeName,
        currentPrice,
        targetPrice,
      });

      setAlertMessage(
        `${group.productName} için ${formatPrice(
          targetPrice,
        )} TL hedef fiyat alarmı oluşturuldu.`,
      );

      setTargetPrices(
        (currentPrices) => ({
          ...currentPrices,
          [productId]: "",
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fiyat alarmı oluşturulurken bir hata oluştu.";

      if (
        message
          .toLocaleLowerCase("tr-TR")
          .includes("giriş")
      ) {
        router.push("/login");
        return;
      }

      setAlertMessage(message);
    } finally {
      setAlertLoadingId(null);
    }
  }

  const searchStatistics = useMemo(() => {
    const totalOffers = groups.reduce(
      (total, group) =>
        total + group.offers.length,
      0,
    );

    const comparableGroups =
      groups.filter(
        (group) => group.isComparable,
      ).length;

    const potentialSavings =
      groups.reduce(
        (total, group) =>
          total + group.maximumSavings,
        0,
      );

    return {
      totalOffers,
      comparableGroups,
      potentialSavings,
    };
  }, [groups]);

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
          borderBottom:
            "1px solid rgba(148, 163, 184, 0.14)",
          backgroundColor:
            "rgba(2, 6, 23, 0.84)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            width:
              "min(1100px, calc(100% - 32px))",
            minHeight: "72px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
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
                background:
                  "linear-gradient(135deg, #22c55e, #14b8a6)",
                color: "#052e16",
                boxShadow:
                  "0 8px 25px rgba(34, 197, 94, 0.3)",
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
                border:
                  "1px solid rgba(250, 204, 21, 0.35)",
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
                border:
                  "1px solid rgba(248, 113, 113, 0.3)",
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
                border:
                  "1px solid rgba(148, 163, 184, 0.25)",
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
          width:
            "min(1100px, calc(100% - 32px))",
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
            Canlı fiyat karşılaştırma
          </p>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize:
                "clamp(34px, 6vw, 58px)",
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
            Çalışan marketlerin güncel
            fiyatlarını tek ekranda
            karşılaştır.
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "28px",
              padding: "8px",
              border:
                "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "18px",
              backgroundColor:
                "rgba(15, 23, 42, 0.78)",
              boxShadow:
                "0 22px 70px rgba(0, 0, 0, 0.3)",
            }}
          >
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Örnek: süt, karpuz veya Coca-Cola"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "16px 18px",
                border: "none",
                outline: "none",
                backgroundColor:
                  "transparent",
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
                color: isLoading
                  ? "#cbd5e1"
                  : "#052e16",
                fontWeight: 900,
                cursor: isLoading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isLoading
                ? "Aranıyor..."
                : "Ara"}
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
                color: favoriteMessage
                  .toLocaleLowerCase("tr-TR")
                  .includes("hata")
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
                  alertMessage
                    .toLocaleLowerCase("tr-TR")
                    .includes("hata") ||
                  alertMessage
                    .toLocaleLowerCase("tr-TR")
                    .includes("geçerli") ||
                  alertMessage
                    .toLocaleLowerCase("tr-TR")
                    .includes("lütfen")
                    ? "#fca5a5"
                    : "#fde68a",
                fontWeight: 700,
              }}
            >
              {alertMessage}
            </p>
          )}
        </div>

        {!isLoading &&
          currentQuery &&
          summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                marginTop: "28px",
              }}
            >
              {[
                {
                  label:
                    "Çalışan market",
                  value:
                    summary.successfulMarkets,
                },
                {
                  label: "Bulunan fiyat",
                  value:
                    searchStatistics.totalOffers,
                },
                {
                  label:
                    "Karşılaştırılabilen ürün",
                  value:
                    searchStatistics.comparableGroups,
                },
                {
                  label:
                    "Potansiyel tasarruf",
                  value: `${formatPrice(
                    searchStatistics.potentialSavings,
                  )} TL`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "16px",
                    border:
                      "1px solid rgba(148, 163, 184, 0.16)",
                    borderRadius: "15px",
                    backgroundColor:
                      "rgba(15, 23, 42, 0.7)",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "22px",
                      fontWeight: 900,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

        {isLoading && (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "260px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                border:
                  "4px solid rgba(148, 163, 184, 0.25)",
                borderTopColor: "#22c55e",
                borderRadius: "50%",
                animation:
                  "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}

        {!isLoading && groups.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "22px",
              marginTop: "30px",
            }}
          >
            {groups.map((group) => {
              const productId =
                createProductId(group);

              const isFavorite =
                favoriteProductIds.has(
                  productId,
                );

              const isFavoriteLoading =
                favoriteLoadingId ===
                productId;

              const isAlertLoading =
                alertLoadingId === productId;

              const targetPrice =
                targetPrices[productId] ??
                "";

              return (
                <section
                  key={`${group.normalizedName}-${productId}`}
                  style={{
                    overflow: "hidden",
                    border:
                      "1px solid rgba(148, 163, 184, 0.16)",
                    borderRadius: "22px",
                    backgroundColor:
                      "rgba(15, 23, 42, 0.78)",
                    boxShadow:
                      "0 18px 55px rgba(0, 0, 0, 0.22)",
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
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "space-between",
                        flexWrap: "wrap",
                        gap: "18px",
                      }}
                    >
                      <div
                        style={{
                          flex: "1 1 500px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "inline-block",
                            marginBottom: "10px",
                            padding: "5px 9px",
                            borderRadius:
                              "999px",
                            backgroundColor:
                              "#22c55e",
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
                            letterSpacing:
                              "-0.5px",
                          }}
                        >
                          {group.productName}
                        </h2>

                        <p
                          style={{
                            margin:
                              "8px 0 0",
                            color: "#94a3b8",
                          }}
                        >
                          {group.storeCount} markette{" "}
                          {group.offerCount} fiyat
                          bulundu
                        </p>

                        {group.isComparable &&
                          group.maximumSavings >
                            0 && (
                            <p
                              style={{
                                margin:
                                  "8px 0 0",
                                color:
                                  "#86efac",
                                fontWeight: 800,
                              }}
                            >
                              En pahalı fiyata göre{" "}
                              {formatPrice(
                                group.maximumSavings,
                              )}{" "}
                              TL tasarruf (
                              {group.savingsPercentage.toLocaleString(
                                "tr-TR",
                              )}
                              %)
                            </p>
                          )}

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "18px",
                          }}
                        >
                          <a
                            href={
                              group
                                .cheapestOffer
                                .sourceUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              padding:
                                "11px 16px",
                              border:
                                "1px solid rgba(255, 255, 255, 0.18)",
                              borderRadius:
                                "12px",
                              backgroundColor:
                                "#ffffff",
                              color: "#0f172a",
                              textDecoration:
                                "none",
                              fontSize: "14px",
                              fontWeight: 900,
                            }}
                          >
                            Market Sayfasını Aç →
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleFavorite(
                                group,
                              )
                            }
                            disabled={
                              isFavoriteLoading
                            }
                            style={{
                              padding:
                                "11px 16px",
                              border: isFavorite
                                ? "1px solid rgba(248, 113, 113, 0.55)"
                                : "1px solid rgba(148, 163, 184, 0.3)",
                              borderRadius:
                                "12px",
                              backgroundColor:
                                isFavorite
                                  ? "rgba(127, 29, 29, 0.55)"
                                  : "rgba(15, 23, 42, 0.8)",
                              color:
                                isFavorite
                                  ? "#fecaca"
                                  : "#e2e8f0",
                              fontSize: "14px",
                              fontWeight: 900,
                              cursor:
                                isFavoriteLoading
                                  ? "wait"
                                  : "pointer",
                              opacity:
                                isFavoriteLoading
                                  ? 0.7
                                  : 1,
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
                            alignItems:
                              "stretch",
                            flexWrap: "wrap",
                            gap: "10px",
                            maxWidth: "470px",
                            marginTop: "16px",
                            padding: "12px",
                            border:
                              "1px solid rgba(250, 204, 21, 0.22)",
                            borderRadius:
                              "14px",
                            backgroundColor:
                              "rgba(113, 63, 18, 0.18)",
                          }}
                        >
                          <div
                            style={{
                              flex:
                                "1 1 180px",
                              minWidth: 0,
                            }}
                          >
                            <label
                              htmlFor={`target-price-${productId}`}
                              style={{
                                display:
                                  "block",
                                marginBottom:
                                  "7px",
                                color:
                                  "#fde68a",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  800,
                              }}
                            >
                              Hedef fiyat
                            </label>

                            <input
                              id={`target-price-${productId}`}
                              type="text"
                              inputMode="decimal"
                              value={targetPrice}
                              onChange={(
                                event,
                              ) => {
                                const value =
                                  event
                                    .target
                                    .value;

                                setTargetPrices(
                                  (
                                    currentPrices,
                                  ) => ({
                                    ...currentPrices,
                                    [productId]:
                                      value,
                                  }),
                                );

                                setAlertMessage(
                                  "",
                                );
                              }}
                              onKeyDown={(
                                event,
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  event.preventDefault();

                                  void handleCreateAlert(
                                    group,
                                  );
                                }
                              }}
                              placeholder={`Örnek: ${formatPrice(
                                Math.max(
                                  group
                                    .cheapestOffer
                                    .price *
                                    0.9,
                                  0.01,
                                ),
                              )}`}
                              disabled={
                                isAlertLoading
                              }
                              style={{
                                width: "100%",
                                boxSizing:
                                  "border-box",
                                padding:
                                  "11px 12px",
                                border:
                                  "1px solid rgba(250, 204, 21, 0.3)",
                                borderRadius:
                                  "10px",
                                outline: "none",
                                backgroundColor:
                                  "rgba(2, 6, 23, 0.68)",
                                color:
                                  "#ffffff",
                                fontSize:
                                  "14px",
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCreateAlert(
                                group,
                              )
                            }
                            disabled={
                              isAlertLoading
                            }
                            style={{
                              alignSelf:
                                "flex-end",
                              minHeight:
                                "42px",
                              padding:
                                "10px 16px",
                              border:
                                "1px solid rgba(250, 204, 21, 0.45)",
                              borderRadius:
                                "10px",
                              backgroundColor:
                                isAlertLoading
                                  ? "rgba(71, 85, 105, 0.8)"
                                  : "rgba(161, 98, 7, 0.58)",
                              color:
                                isAlertLoading
                                  ? "#cbd5e1"
                                  : "#fef3c7",
                              fontSize:
                                "14px",
                              fontWeight: 900,
                              cursor:
                                isAlertLoading
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
                          minWidth: "200px",
                          padding: "16px",
                          border:
                            "1px solid rgba(34, 197, 94, 0.28)",
                          borderRadius: "16px",
                          backgroundColor:
                            "rgba(5, 46, 22, 0.72)",
                        }}
                      >
                        <div
                          style={{
                            color: "#86efac",
                            fontSize: "13px",
                            fontWeight: 800,
                          }}
                        >
                          {
                            group
                              .cheapestOffer
                              .storeName
                          }
                        </div>

                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "30px",
                            fontWeight: 900,
                          }}
                        >
                          {formatPrice(
                            group.cheapestPrice,
                          )}{" "}
                          TL
                        </div>

                        {group.maximumSavings >
                          0 && (
                          <div
                            style={{
                              marginTop: "7px",
                              color: "#86efac",
                              fontSize: "13px",
                              fontWeight: 700,
                            }}
                          >
                            {formatPrice(
                              group.maximumSavings,
                            )}{" "}
                            TL tasarruf
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
                    {group.offers.map(
                      (offer, index) => {
                        const isCheapest =
                          offer.isCheapest ??
                          index === 0;

                        const difference =
                          getOfferDifference(
                            offer,
                            group.cheapestPrice,
                          );

                        return (
                          <article
                            key={`${offer.storeName}-${offer.sourceUrl}-${index}`}
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              flexWrap:
                                "wrap",
                              gap: "16px",
                              padding: "16px",
                              border:
                                isCheapest
                                  ? "1px solid rgba(34, 197, 94, 0.38)"
                                  : "1px solid rgba(148, 163, 184, 0.14)",
                              borderRadius:
                                "14px",
                              backgroundColor:
                                isCheapest
                                  ? "rgba(5, 46, 22, 0.55)"
                                  : "rgba(2, 6, 23, 0.45)",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  flexWrap:
                                    "wrap",
                                  gap: "8px",
                                  fontSize:
                                    "18px",
                                  fontWeight:
                                    800,
                                }}
                              >
                                {offer.storeName}

                                {isCheapest && (
                                  <span
                                    style={{
                                      padding:
                                        "3px 7px",
                                      borderRadius:
                                        "999px",
                                      backgroundColor:
                                        "#22c55e",
                                      color:
                                        "#052e16",
                                      fontSize:
                                        "10px",
                                      fontWeight:
                                        900,
                                    }}
                                  >
                                    EN İYİ FİYAT
                                  </span>
                                )}

                                {offer.rank && (
                                  <span
                                    style={{
                                      color:
                                        "#94a3b8",
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    #{offer.rank}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    isCheapest
                                      ? "#86efac"
                                      : "#94a3b8",
                                  fontSize:
                                    "14px",
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
                                textAlign:
                                  "right",
                              }}
                            >
                              <div
                                style={{
                                  whiteSpace:
                                    "nowrap",
                                  fontSize:
                                    "22px",
                                  fontWeight:
                                    900,
                                }}
                              >
                                {formatPrice(
                                  offer.price,
                                )}{" "}
                                TL
                              </div>

                              {!isCheapest &&
                                typeof offer.priceDifferencePercentage ===
                                  "number" && (
                                  <div
                                    style={{
                                      marginTop:
                                        "4px",
                                      color:
                                        "#fca5a5",
                                      fontSize:
                                        "12px",
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    %
                                    {offer.priceDifferencePercentage.toLocaleString(
                                      "tr-TR",
                                    )}{" "}
                                    daha pahalı
                                  </div>
                                )}
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!isLoading &&
          currentQuery &&
          groups.length === 0 && (
            <div
              style={{
                maxWidth: "620px",
                margin: "36px auto 0",
                padding: "34px",
                border:
                  "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "20px",
                backgroundColor:
                  "rgba(15, 23, 42, 0.7)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                }}
              >
                🔎
              </div>

              <h2
                style={{
                  margin:
                    "14px 0 8px",
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
                Ürün adını farklı yazarak
                veya barkodu doğrudan girerek
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

        @media (max-width: 680px) {
          form {
            align-items: stretch;
          }
        }
      `}</style>
    </main>
  );
}
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
          }}
        >
          Ürün arama sayfası yükleniyor…
        </main>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}