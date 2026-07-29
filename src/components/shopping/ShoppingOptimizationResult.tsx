"use client";

import { useEffect, useState } from "react";

import type {
  ShoppingOptimizationResult as OptimizationResult,
  StoreBasketGroup,
} from "../../services/shopping/ShoppingOptimizationService";

type Props = {
  result: OptimizationResult | null;
};

type StoreBrand = {
  shortName: string;
  background: string;
  color: string;
  border: string;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type StoreLocation = {
  store_name: string;
  branch_name: string | null;
  latitude: number;
  longitude: number;
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371;

  const latitudeDifference =
    ((lat2 - lat1) * Math.PI) / 180;

  const longitudeDifference =
    ((lon2 - lon1) * Math.PI) / 180;

  const calculation =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(1 - calculation),
    );

  return earthRadius * angle;
}

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeStoreName(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/\s+/g, "")
    .trim();
}

function storeNamesMatch(
  firstStoreName: string,
  secondStoreName: string,
) {
  const first = normalizeStoreName(firstStoreName);
  const second = normalizeStoreName(secondStoreName);

  return (
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
}

function getStoreBrand(storeName: string): StoreBrand {
  const normalizedName = normalizeStoreName(storeName);

  if (normalizedName.includes("bim")) {
    return {
      shortName: "BİM",
      background: "#dc2626",
      color: "#ffffff",
      border: "#f87171",
    };
  }

  if (normalizedName.includes("a101")) {
    return {
      shortName: "A101",
      background: "#2563eb",
      color: "#ffffff",
      border: "#60a5fa",
    };
  }

  if (normalizedName.includes("migros")) {
    return {
      shortName: "M",
      background: "#f97316",
      color: "#ffffff",
      border: "#fb923c",
    };
  }

  if (normalizedName.includes("carrefour")) {
    return {
      shortName: "CarrefourSA",
      background: "#1d4ed8",
      color: "#ffffff",
      border: "#60a5fa",
    };
  }

  if (normalizedName.includes("sok")) {
    return {
      shortName: "ŞOK",
      background: "#facc15",
      color: "#172554",
      border: "#fde047",
    };
  }

  return {
    shortName: storeName
      .slice(0, 3)
      .toLocaleUpperCase("tr-TR"),
    background: "#334155",
    color: "#ffffff",
    border: "#64748b",
  };
}

function createGoogleMapsSearchUrl(storeName: string) {
  const query = encodeURIComponent(
    `${storeName} market`,
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function createGoogleMapsRouteUrl(
  stores: StoreBasketGroup[],
  storeLocations: StoreLocation[],
  userLocation: UserLocation | null,
) {
  if (stores.length === 0) {
    return "https://www.google.com/maps";
  }

  let currentLocation = userLocation;

  const destinations = stores.map((store) => {
    const matchingLocations = storeLocations.filter(
      (location) =>
        storeNamesMatch(
          location.store_name,
          store.storeName,
        ),
    );

    if (matchingLocations.length === 0) {
      return `${store.storeName} market`;
    }

    if (!currentLocation) {
      const firstLocation = matchingLocations[0];

      currentLocation = {
        latitude: firstLocation.latitude,
        longitude: firstLocation.longitude,
      };

      return `${firstLocation.latitude},${firstLocation.longitude}`;
    }

    const nearestLocation = matchingLocations.reduce(
      (nearest, candidate) => {
        const candidateDistance = calculateDistance(
          currentLocation!.latitude,
          currentLocation!.longitude,
          candidate.latitude,
          candidate.longitude,
        );

        const nearestDistance = calculateDistance(
          currentLocation!.latitude,
          currentLocation!.longitude,
          nearest.latitude,
          nearest.longitude,
        );

        return candidateDistance < nearestDistance
          ? candidate
          : nearest;
      },
    );

    currentLocation = {
      latitude: nearestLocation.latitude,
      longitude: nearestLocation.longitude,
    };

    return `${nearestLocation.latitude},${nearestLocation.longitude}`;
  });

  const destination =
    destinations[destinations.length - 1];

  const waypoints = destinations.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });

  if (userLocation) {
    params.set(
      "origin",
      `${userLocation.latitude},${userLocation.longitude}`,
    );
  }

  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function StoreLogo({
  storeName,
  size = 48,
}: {
  storeName: string;
  size?: number;
}) {
  const brand = getStoreBrand(storeName);

  return (
    <div
      aria-label={`${storeName} logosu`}
      title={storeName}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "grid",
        flexShrink: 0,
        placeItems: "center",
        padding: "4px",
        border: `1px solid ${brand.border}`,
        borderRadius: "13px",
        background: brand.background,
        color: brand.color,
        fontSize:
          brand.shortName.length > 4
            ? "9px"
            : brand.shortName.length > 2
              ? "12px"
              : "20px",
        fontWeight: 950,
        lineHeight: 1,
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      {brand.shortName}
    </div>
  );
}

function StoreResultCard({
  store,
}: {
  store: StoreBasketGroup;
}) {
  const mapsUrl = createGoogleMapsSearchUrl(
    store.storeName,
  );

  return (
    <article
      style={{
        marginTop: "18px",
        padding: "16px",
        borderRadius: "14px",
        border:
          "1px solid rgba(148, 163, 184, 0.16)",
        background: "rgba(15, 23, 42, 0.72)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <StoreLogo storeName={store.storeName} />

          <div>
            <h3
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: "18px",
              }}
            >
              {store.storeName}
            </h3>

            <span
              style={{
                display: "block",
                marginTop: "4px",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              {store.items.length} ürün alınacak
            </span>
          </div>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "10px 13px",
            border:
              "1px solid rgba(96, 165, 250, 0.38)",
            borderRadius: "10px",
            background: "rgba(30, 64, 175, 0.24)",
            color: "#bfdbfe",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 850,
          }}
        >
          📍 Haritada Bul
        </a>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        {store.items.map((item) => (
          <div
            key={item.shoppingItemId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              padding: "10px 0",
              borderBottom:
                "1px solid rgba(148, 163, 184, 0.1)",
            }}
          >
            <span>
              <strong
                style={{
                  display: "block",
                  color: "#f8fafc",
                }}
              >
                {item.matchedProductName}
              </strong>

              <small
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#94a3b8",
                }}
              >
                {item.quantity.toLocaleString(
                  "tr-TR",
                )}{" "}
                {item.unit} ×{" "}
                {formatCurrency(item.unitPrice)}
              </small>
            </span>

            <strong
              style={{
                flexShrink: 0,
                color: "#e2e8f0",
              }}
            >
              {formatCurrency(item.totalPrice)}
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          marginTop: "14px",
          paddingTop: "13px",
          borderTop:
            "1px solid rgba(148, 163, 184, 0.24)",
        }}
      >
        <strong>Market toplamı</strong>

        <strong
          style={{
            color: "#4ade80",
          }}
        >
          {formatCurrency(store.total)}
        </strong>
      </div>
    </article>
  );
}

export default function ShoppingOptimizationResult({
  result,
}: Props) {
  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(null);

  const [storeLocations, setStoreLocations] =
    useState<StoreLocation[]>([]);

  useEffect(() => {
    fetch("/api/store-locations")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Market şubeleri alınamadı.",
          );
        }

        return response.json();
      })
      .then((responseData) => {
        if (
          responseData.success &&
          Array.isArray(responseData.data)
        ) {
          setStoreLocations(responseData.data);
        }
      })
      .catch((error) => {
        console.warn(
          "Market şubeleri alınamadı:",
          error,
        );
      });

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn(
          "Kullanıcı konumu alınamadı:",
          error,
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  if (!result) {
    return null;
  }

  const hasSavings =
    result.recommendedSavings > 0;

  const storeCount = result.storeGroups.length;

  const uniqueStoreCount = new Set(
    result.storeGroups.map((store) =>
      normalizeStoreName(store.storeName),
    ),
  ).size;

  const multipleStores = uniqueStoreCount > 1;

  const routeUrl = createGoogleMapsRouteUrl(
    result.storeGroups,
    storeLocations,
    userLocation,
  );

  return (
    <section
      style={{
        marginTop: "24px",
        padding: "20px",
        borderRadius: "18px",
        border:
          "1px solid rgba(34, 197, 94, 0.3)",
        background: "rgba(5, 46, 22, 0.45)",
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#4ade80",
          fontSize: "21px",
        }}
      >
        En Ucuz Market Kombinasyonu
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        <div
          style={{
            padding: "13px",
            borderRadius: "11px",
            background: "rgba(15, 23, 42, 0.7)",
          }}
        >
          <span
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            En ucuz toplam
          </span>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "18px",
            }}
          >
            {formatCurrency(
              result.recommendedTotal,
            )}
          </strong>
        </div>

        <div
          style={{
            padding: "13px",
            borderRadius: "11px",
            background: "rgba(15, 23, 42, 0.7)",
          }}
        >
          <span
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Tek market toplamı
          </span>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "18px",
            }}
          >
           {result.singleStoreTotal > 0
  ? formatCurrency(
      result.singleStoreTotal,
    )
  : "Tüm ürünler tek markette yok"}
          </strong>
        </div>

        <div
          style={{
            padding: "13px",
            borderRadius: "11px",
            background: hasSavings
              ? "rgba(20, 83, 45, 0.7)"
              : "rgba(15, 23, 42, 0.7)",
          }}
        >
          <span
            style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Kazancınız
          </span>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              color: "#4ade80",
              fontSize: "18px",
            }}
          >
            {formatCurrency(
              result.recommendedSavings,
            )}
          </strong>
        </div>
      </div>

      <div
        style={{
          marginTop: "15px",
          padding: "15px",
          borderRadius: "13px",
          border:
            "1px solid rgba(96, 165, 250, 0.32)",
          background: "rgba(30, 64, 175, 0.19)",
        }}
      >
        <strong
          style={{
            display: "block",
            color: "#bfdbfe",
          }}
        >
          Önerilen alışveriş planı
        </strong>

        <span
          style={{
            display: "block",
            marginTop: "6px",
            color: "#dbeafe",
            lineHeight: 1.6,
          }}
        >
          {storeCount <= 1
           ? "Tüm ürünleri tek marketten almak şu anda en uygun seçenektir."
: result.recommendedSavings > 0
  ? `${storeCount} markete giderek ${formatCurrency(
      result.recommendedSavings,
    )} tasarruf edebilirsiniz.`
  : `Tüm ürünleri almak için ${storeCount} market gerekiyor.`}
        </span>
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "16px",
          borderRadius: "14px",
          border:
            "1px solid rgba(45, 212, 191, 0.28)",
          background: "rgba(15, 118, 110, 0.12)",
        }}
      >
        <strong
          style={{
            display: "block",
            color: "#99f6e4",
            fontSize: "17px",
          }}
        >
          🧭 Yol Planı
        </strong>

        <p
          style={{
            margin: "6px 0 15px",
            color: "#ccfbf1",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          Konumunuza göre en yakın market
          şubeleri rotaya eklenir.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          {result.storeGroups.map(
            (store, index) => (
              <div
                key={store.storeId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "11px",
                  borderRadius: "12px",
                  background:
                    "rgba(15, 23, 42, 0.62)",
                }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "grid",
                    flexShrink: 0,
                    placeItems: "center",
                    borderRadius: "999px",
                    background: "#14b8a6",
                    color: "#042f2e",
                    fontWeight: 950,
                  }}
                >
                  {index + 1}
                </span>

                <StoreLogo
                  storeName={store.storeName}
                  size={38}
                />

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#f8fafc",
                    }}
                  >
                    {store.storeName}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    {store.items.length} ürün ·{" "}
                    {formatCurrency(store.total)}
                  </span>
                </div>

                <a
                  href={createGoogleMapsSearchUrl(
                    store.storeName,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexShrink: 0,
                    padding: "8px 10px",
                    borderRadius: "9px",
                    background:
                      "rgba(37, 99, 235, 0.28)",
                    color: "#bfdbfe",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 850,
                  }}
                >
                  Maps
                </a>
              </div>
            ),
          )}
        </div>
      </div>

      {result.storeGroups.map((store) => (
        <StoreResultCard
          key={store.storeId}
          store={store}
        />
      ))}

      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          marginTop: "16px",
          padding: "13px 16px",
          borderRadius: "12px",
          background: "#2563eb",
          color: "#ffffff",
          textAlign: "center",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 800,
        }}
      >
        {multipleStores
          ? "🗺️ Akıllı Rotayı Başlat"
          : "📍 Rotayı Başlat"}
      </a>

      {result.unmatchedItems.length > 0 && (
        <div
          style={{
            marginTop: "18px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(251, 191, 36, 0.35)",
            background: "rgba(120, 53, 15, 0.24)",
          }}
        >
          <strong
            style={{
              color: "#fde68a",
            }}
          >
            Fiyatı bulunamayan ürünler
          </strong>

          {result.unmatchedItems.map((item) => (
            <p
              key={item.shoppingItemId}
              style={{
                margin: "8px 0 0",
                color: "#fef3c7",
              }}
            >
              {item.productName}: {item.reason}
            </p>
          ))}
        </div>
      )}


    </section>
  );
}