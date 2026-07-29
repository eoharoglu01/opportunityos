"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  alertService,
  type PriceAlert,
} from "../../src/services/AlertService";

function formatPrice(value: number | null) {
  if (value === null) {
    return "Fiyat bilgisi yok";
  }

  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

export default function AlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const data = await alertService.getAlerts();

        if (active) {
          setAlerts(data);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Fiyat alarmları yüklenemedi.";

        if (message.toLocaleLowerCase("tr-TR").includes("giriş")) {
          router.replace("/login");
          return;
        }

        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleToggleStatus(alert: PriceAlert) {
    setProcessingId(alert.id);
    setError("");

    try {
      await alertService.updateAlertStatus(alert.id, !alert.is_active);

      setAlerts((currentAlerts) =>
        currentAlerts.map((currentAlert) =>
          currentAlert.id === alert.id
            ? {
                ...currentAlert,
                is_active: !currentAlert.is_active,
              }
            : currentAlert,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Alarm durumu güncellenemedi.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRemoveAlert(alertId: number) {
    setProcessingId(alertId);
    setError("");

    try {
      await alertService.removeAlert(alertId);

      setAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert.id !== alertId),
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Fiyat alarmı silinemedi.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>OPPORTUNITYOS</p>
            <h1 style={styles.title}>Fiyat Alarmlarım</h1>
            <p style={styles.subtitle}>
              Hedef fiyatlarını takip et, aktif alarmlarını yönet.
            </p>
          </div>

          <Link href="/dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
        </header>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        {loading ? (
          <section style={styles.emptyState}>
            <p style={styles.emptyTitle}>Fiyat alarmları yükleniyor...</p>
          </section>
        ) : alerts.length === 0 ? (
          <section style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔔</span>

            <h2 style={styles.emptyTitle}>Henüz fiyat alarmın yok</h2>

            <p style={styles.emptyText}>
              Favori ürünlerinden birine hedef fiyat belirlediğinde burada
              görüntülenecek.
            </p>

            <Link href="/favorites" style={styles.primaryButton}>
              Favorilere git
            </Link>
          </section>
        ) : (
          <section style={styles.grid}>
            {alerts.map((alert) => {
              const isProcessing = processingId === alert.id;
              const priceDifference =
                alert.current_price === null
                  ? null
                  : alert.current_price - alert.target_price;

              return (
                <article key={alert.id} style={styles.card}>
                  <div>
                    <div style={styles.cardTop}>
                      <p style={styles.store}>
                        {alert.store || "Mağaza bilgisi yok"}
                      </p>

                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(alert.is_active
                            ? styles.activeBadge
                            : styles.passiveBadge),
                        }}
                      >
                        {alert.is_active ? "AKTİF" : "PASİF"}
                      </span>
                    </div>

                    <h2 style={styles.productName}>
                      {alert.product_name}
                    </h2>

                    <div style={styles.priceGrid}>
                      <div style={styles.priceBox}>
                        <span style={styles.priceLabel}>Mevcut fiyat</span>
                        <strong style={styles.currentPrice}>
                          {formatPrice(alert.current_price)}
                        </strong>
                      </div>

                      <div style={styles.priceBox}>
                        <span style={styles.priceLabel}>Hedef fiyat</span>
                        <strong style={styles.targetPrice}>
                          {formatPrice(alert.target_price)}
                        </strong>
                      </div>
                    </div>

                    {priceDifference !== null && (
                      <p style={styles.difference}>
                        {priceDifference <= 0
                          ? "🎉 Hedef fiyata ulaşıldı."
                          : `Hedefe ${formatPrice(
                              priceDifference,
                            )} kaldı.`}
                      </p>
                    )}
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(alert)}
                      disabled={isProcessing}
                      style={styles.toggleButton}
                    >
                      {isProcessing
                        ? "İşleniyor..."
                        : alert.is_active
                          ? "Alarmı durdur"
                          : "Alarmı etkinleştir"}
                    </button>

                    <Link
                      href={`/product/${encodeURIComponent(
                        alert.product_id,
                      )}`}
                      style={styles.detailsButton}
                    >
                      Ürünü görüntüle
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemoveAlert(alert.id)}
                      disabled={isProcessing}
                      style={styles.removeButton}
                    >
                      {isProcessing ? "İşleniyor..." : "Alarmı sil"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px",
    background:
      "radial-gradient(circle at top, #172554 0%, #0f172a 38%, #020617 100%)",
    color: "#f8fafc",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "36px",
  },
  eyebrow: {
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#34d399",
  },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 5vw, 52px)",
  },
  subtitle: {
    maxWidth: "620px",
    margin: "10px 0 0",
    lineHeight: 1.6,
    color: "#94a3b8",
  },
  backButton: {
    padding: "12px 16px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "12px",
    background: "rgba(15, 23, 42, 0.75)",
    color: "#e2e8f0",
    textDecoration: "none",
  },
  error: {
    marginBottom: "20px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    padding: "64px 24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.72)",
    textAlign: "center",
  },
  emptyIcon: {
    marginBottom: "18px",
    fontSize: "48px",
  },
  emptyTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
  },
  emptyText: {
    maxWidth: "480px",
    margin: "0 0 24px",
    lineHeight: 1.6,
    color: "#94a3b8",
  },
  primaryButton: {
    padding: "12px 18px",
    borderRadius: "12px",
    background: "#34d399",
    color: "#052e16",
    fontWeight: 800,
    textDecoration: "none",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    display: "flex",
    minHeight: "340px",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "26px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    background: "rgba(15, 23, 42, 0.8)",
    boxShadow: "0 18px 55px rgba(0, 0, 0, 0.22)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  store: {
    margin: 0,
    color: "#34d399",
    fontWeight: 700,
  },
  statusBadge: {
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 900,
  },
  activeBadge: {
    background: "rgba(34, 197, 94, 0.18)",
    color: "#86efac",
  },
  passiveBadge: {
    background: "rgba(148, 163, 184, 0.16)",
    color: "#cbd5e1",
  },
  productName: {
    margin: "16px 0 22px",
    fontSize: "24px",
    lineHeight: 1.35,
  },
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  priceBox: {
    padding: "14px",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.45)",
  },
  priceLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#94a3b8",
    fontSize: "12px",
  },
  currentPrice: {
    display: "block",
    fontSize: "18px",
  },
  targetPrice: {
    display: "block",
    color: "#86efac",
    fontSize: "18px",
  },
  difference: {
    margin: "16px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.5,
  },
  cardActions: {
    display: "grid",
    gap: "10px",
  },
  toggleButton: {
    padding: "12px 14px",
    border: "1px solid rgba(250, 204, 21, 0.35)",
    borderRadius: "12px",
    background: "rgba(113, 63, 18, 0.28)",
    color: "#fde68a",
    fontWeight: 800,
    cursor: "pointer",
  },
  detailsButton: {
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#34d399",
    color: "#052e16",
    fontWeight: 800,
    textAlign: "center",
    textDecoration: "none",
  },
  removeButton: {
    padding: "12px 14px",
    border: "1px solid rgba(248, 113, 113, 0.4)",
    borderRadius: "12px",
    background: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
    fontWeight: 800,
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;