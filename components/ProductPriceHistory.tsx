"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryPoint = {
  id: string;
  productId: string;
  storeId: string;
  store: string;
  price: number;
  currency: string;
  recordedAt: string;
};

type HistorySummary = {
  count: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  latestPrice: number | null;
  currency: string;
  lastUpdatedAt: string | null;
};

type HistoryResponse = {
  success: boolean;
  data?: HistoryPoint[];
  summary?: HistorySummary;
  error?: string;
};

type ProductPriceHistoryProps = {
  barcode: string;
};

function formatPrice(value: number | null, currency = "TRY") {
  if (value === null) return "—";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ProductPriceHistory({
  barcode,
}: ProductPriceHistoryProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [summary, setSummary] = useState<HistorySummary>({
    count: 0,
    lowestPrice: null,
    highestPrice: null,
    latestPrice: null,
    currency: "TRY",
    lastUpdatedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/history?barcode=${encodeURIComponent(barcode)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as HistoryResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error ?? "Fiyat geçmişi şu anda alınamıyor.",
          );
        }

        setHistory(payload.data ?? []);
        setSummary(
          payload.summary ?? {
            count: 0,
            lowestPrice: null,
            highestPrice: null,
            latestPrice: null,
            currency: "TRY",
            lastUpdatedAt: null,
          },
        );
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Fiyat geçmişi şu anda alınamıyor.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => controller.abort();
  }, [barcode]);

  const chartData = useMemo(
    () =>
      history.map((point, index) => ({
        ...point,
        order: index + 1,
        dateLabel: formatDate(point.recordedAt),
      })),
    [history],
  );

  return (
    <section
      style={{
        marginTop: "28px",
        padding: "24px",
        border: "1px solid rgba(148, 163, 184, 0.16)",
        borderRadius: "20px",
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(2, 6, 23, 0.72))",
        boxShadow: "0 20px 55px rgba(2, 6, 23, 0.24)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#60a5fa",
          fontSize: "13px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Fiyat geçmişi
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "28px" }}>Son 30 gün</h2>
          <p
            style={{
              margin: "7px 0 0",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            Marketlerde kaydedilen fiyatların değişimini takip edin.
          </p>
        </div>

        {summary.lastUpdatedAt && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              backgroundColor: "rgba(30, 41, 59, 0.74)",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Güncelleme: {formatDateTime(summary.lastUpdatedAt)}
          </div>
        )}
      </div>

      {isLoading && (
        <div
          style={{
            minHeight: "280px",
            display: "grid",
            placeItems: "center",
            marginTop: "20px",
            border: "1px dashed rgba(148, 163, 184, 0.24)",
            borderRadius: "18px",
            backgroundColor: "rgba(2, 6, 23, 0.36)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                margin: "0 auto 14px",
                border: "4px solid rgba(148, 163, 184, 0.2)",
                borderTopColor: "#22c55e",
                borderRadius: "50%",
                animation: "price-history-spin 0.8s linear infinite",
              }}
            />
            <strong>Fiyat geçmişi yükleniyor</strong>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div
          style={{
            marginTop: "20px",
            padding: "22px",
            border: "1px solid rgba(248, 113, 113, 0.28)",
            borderRadius: "18px",
            backgroundColor: "rgba(127, 29, 29, 0.16)",
          }}
        >
          <strong style={{ color: "#fca5a5" }}>
            Fiyat geçmişi gösterilemedi
          </strong>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{error}</p>
        </div>
      )}

      {!isLoading && !error && history.length === 0 && (
        <div
          style={{
            minHeight: "220px",
            display: "grid",
            placeItems: "center",
            marginTop: "20px",
            padding: "24px",
            border: "1px dashed rgba(148, 163, 184, 0.25)",
            borderRadius: "18px",
            backgroundColor: "rgba(2, 6, 23, 0.36)",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "460px" }}>
            <div style={{ fontSize: "42px" }}>📊</div>
            <h3 style={{ margin: "12px 0 8px" }}>
              Henüz yeterli geçmiş veri yok
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.7 }}>
              Yeni fiyat kayıtları geldikçe bu alanda son 30 günlük değişim
              grafiği otomatik oluşacak.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && history.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            {[
              {
                label: "Güncel fiyat",
                value: formatPrice(summary.latestPrice, summary.currency),
              },
              {
                label: "En düşük",
                value: formatPrice(summary.lowestPrice, summary.currency),
              },
              {
                label: "En yüksek",
                value: formatPrice(summary.highestPrice, summary.currency),
              },
              {
                label: "Kayıt sayısı",
                value: String(summary.count),
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "17px",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  borderRadius: "15px",
                  backgroundColor: "rgba(15, 23, 42, 0.68)",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    marginTop: "7px",
                    color: "#f8fafc",
                    fontSize: "22px",
                    fontWeight: 950,
                  }}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              width: "100%",
              height: "330px",
              marginTop: "20px",
              padding: "18px 10px 8px",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              borderRadius: "18px",
              backgroundColor: "rgba(2, 6, 23, 0.38)",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("tr-TR", {
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid rgba(148, 163, 184, 0.24)",
                    borderRadius: "14px",
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    boxShadow: "0 16px 40px rgba(2, 6, 23, 0.38)",
                  }}
                  labelStyle={{ color: "#cbd5e1", marginBottom: "6px" }}
                  formatter={(value, _name, item) => {
                    const point = item.payload as HistoryPoint;
                    return [
                      `${formatPrice(Number(value), point.currency)} · ${point.store}`,
                      "Fiyat",
                    ];
                  }}
                  labelFormatter={(_label, payload) => {
                    const point = payload?.[0]?.payload as
                      | HistoryPoint
                      | undefined;
                    return point ? formatDateTime(point.recordedAt) : "";
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Fiyat"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#22c55e",
                    stroke: "#052e16",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: "#86efac",
                    stroke: "#166534",
                    strokeWidth: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            {history
              .slice()
              .reverse()
              .slice(0, 6)
              .map((point) => (
                <div
                  key={point.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    padding: "13px 15px",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "13px",
                    backgroundColor: "rgba(15, 23, 42, 0.52)",
                  }}
                >
                  <div>
                    <strong>{point.store}</strong>
                    <div
                      style={{
                        marginTop: "4px",
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      {formatDateTime(point.recordedAt)}
                    </div>
                  </div>
                  <strong style={{ fontSize: "18px" }}>
                    {formatPrice(point.price, point.currency)}
                  </strong>
                </div>
              ))}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes price-history-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}
