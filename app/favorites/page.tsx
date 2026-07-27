"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  favoriteService,
  type Favorite,
} from "../../src/services/favorites/FavoriteService";

function formatPrice(value: number | null) {
  if (value === null) {
    return "Fiyat bilgisi yok";
  }

  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

export default function FavoritesPage() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingProductId, setRemovingProductId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      try {
        const data = await favoriteService.getFavorites();

        if (active) {
          setFavorites(data);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Favoriler yüklenemedi.";

        if (message.includes("giriş yapmalısınız")) {
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

    void loadFavorites();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleRemoveFavorite(productId: string) {
    setRemovingProductId(productId);
    setError("");

    try {
      await favoriteService.removeFavorite(productId);

      setFavorites((currentFavorites) =>
        currentFavorites.filter(
          (favorite) => favorite.product_id !== productId,
        ),
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Favori kaldırılırken bir hata oluştu.",
      );
    } finally {
      setRemovingProductId(null);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>OPPORTUNITYOS</p>
            <h1 style={styles.title}>Favorilerim</h1>
            <p style={styles.subtitle}>
              Kaydettiğin ürünleri ve güncel fiyatlarını burada görebilirsin.
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
            <p style={styles.emptyTitle}>Favoriler yükleniyor...</p>
          </section>
        ) : favorites.length === 0 ? (
          <section style={styles.emptyState}>
            <span style={styles.emptyIcon}>❤️</span>

            <h2 style={styles.emptyTitle}>Henüz favorin yok</h2>

            <p style={styles.emptyText}>
              Beğendiğin ürünleri favorilerine eklediğinde burada
              görüntülenecek.
            </p>

            <Link href="/" style={styles.primaryButton}>
              Ürün ara
            </Link>
          </section>
        ) : (
          <section style={styles.grid}>
            {favorites.map((favorite) => (
              <article key={favorite.id} style={styles.card}>
                <div>
                  <p style={styles.store}>
                    {favorite.store || "Mağaza bilgisi yok"}
                  </p>

                  <h2 style={styles.productName}>
                    {favorite.product_name}
                  </h2>

                  <p style={styles.price}>
                    {formatPrice(favorite.price)}
                  </p>
                </div>

                <div style={styles.cardActions}>
                  <Link
                    href={`/product/${encodeURIComponent(
                      favorite.product_id,
                    )}`}
                    style={styles.detailsButton}
                  >
                    Ürünü görüntüle
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveFavorite(favorite.product_id)
                    }
                    disabled={
                      removingProductId === favorite.product_id
                    }
                    style={styles.removeButton}
                  >
                    {removingProductId === favorite.product_id
                      ? "Kaldırılıyor..."
                      : "Favoriden kaldır"}
                  </button>
                </div>
              </article>
            ))}
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
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    display: "flex",
    minHeight: "240px",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    background: "rgba(15, 23, 42, 0.78)",
  },
  store: {
    margin: "0 0 10px",
    color: "#34d399",
    fontWeight: 700,
  },
  productName: {
    margin: "0 0 18px",
    fontSize: "22px",
    lineHeight: 1.35,
  },
  price: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
  },
  cardActions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
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
    cursor: "pointer",
  },
} satisfies Record<string, React.CSSProperties>;