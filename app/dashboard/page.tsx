"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { authService } from "../../src/services/auth/AuthService";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const currentUser = await authService.getCurrentUser();

        if (!active) {
          return;
        }

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Kullanıcı bilgileri alınamadı.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      await authService.signOut();
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Çıkış yapılırken bir hata oluştu.",
      );
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <p>Kullanıcı bilgileri yükleniyor...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={styles.center}>
        <p>{error || "Giriş sayfasına yönlendiriliyorsun..."}</p>
      </main>
    );
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Kullanıcı";

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>MARKETRADAR PANELİ</p>
            <h1 style={styles.title}>Hoş geldin, {fullName}</h1>
            <p style={styles.subtitle}>{user.email}</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={styles.signOutButton}
          >
            {signingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
          </button>
        </header>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        <section style={styles.grid}>
          <Link href="/favorites" style={styles.card}>
            <span style={styles.icon}>❤️</span>
            <h2 style={styles.cardTitle}>Favorilerim</h2>
            <p style={styles.cardText}>
              Takip ettiğin ürünleri tek ekrandan görüntüle.
            </p>
          </Link>

          <Link href="/alerts" style={styles.card}>
            <span style={styles.icon}>🔔</span>
            <h2 style={styles.cardTitle}>Fiyat Alarmlarım</h2>
            <p style={styles.cardText}>
              Hedef fiyatlarını ve aktif alarmlarını yönet.
            </p>
          </Link>

          <Link href="/notifications" style={styles.card}>
            <span style={styles.icon}>📢</span>
            <h2 style={styles.cardTitle}>Bildirimler</h2>
            <p style={styles.cardText}>
              Fiyat düşüşlerini ve fırsat bildirimlerini incele.
            </p>
          </Link>

          <Link href="/" style={styles.card}>
            <span style={styles.icon}>🔎</span>
            <h2 style={styles.cardTitle}>Ürün Ara</h2>
            <p style={styles.cardText}>
              Yeni ürünleri karşılaştır ve en iyi fiyatı bul.
            </p>
          </Link>
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px",
  },
  center: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
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
    fontSize: "clamp(30px, 5vw, 52px)",
  },
  subtitle: {
    margin: "10px 0 0",
    color: "#94a3b8",
  },
  signOutButton: {
    minHeight: "44px",
    padding: "0 18px",
    border: "1px solid rgba(248, 113, 113, 0.4)",
    borderRadius: "12px",
    background: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
    cursor: "pointer",
  },
  error: {
    marginBottom: "20px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
  },
  card: {
    minHeight: "210px",
    padding: "26px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    background: "rgba(15, 23, 42, 0.78)",
    textDecoration: "none",
    color: "inherit",
  },
  icon: {
    display: "block",
    marginBottom: "24px",
    fontSize: "34px",
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "22px",
  },
  cardText: {
    margin: 0,
    lineHeight: 1.6,
    color: "#94a3b8",
  },
} satisfies Record<string, React.CSSProperties>;