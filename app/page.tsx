"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  {
    name: "Market",
    icon: "🛒",
    description: "Gıda ve temel ihtiyaçlar",
  },
  {
    name: "İçecek",
    icon: "🥤",
    description: "En uygun içecek fiyatları",
  },
  {
    name: "Temizlik",
    icon: "🧴",
    description: "Ev bakım ürünleri",
  },
  {
    name: "Kişisel bakım",
    icon: "🧼",
    description: "Günlük bakım ürünleri",
  },
];

const benefits = [
  {
    icon: "⚡",
    title: "Anında karşılaştır",
    description:
      "Aynı ürünün farklı marketlerdeki fiyatlarını saniyeler içinde gör.",
  },
  {
    icon: "▥",
    title: "Barkodla ara",
    description:
      "Ürünün barkodunu okut, en ucuz marketi hemen öğren.",
  },
  {
    icon: "₺",
    title: "Tasarruf et",
    description:
      "Marketler arasındaki fiyat farkını ve tasarruf miktarını gör.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) return;

    router.push(`/search?query=${encodeURIComponent(cleanedQuery)}`);
  }

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
          backgroundColor: "rgba(2, 6, 23, 0.82)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 32px))",
            minHeight: "72px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "21px",
              fontWeight: 900,
              letterSpacing: "-0.6px",
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
              padding: "10px 15px",
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
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "76px 0 48px",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "22px",
              padding: "7px 12px",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "999px",
              backgroundColor: "rgba(34, 197, 94, 0.09)",
              color: "#86efac",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            Akıllı fiyat karşılaştırma platformu
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(40px, 7vw, 76px)",
              lineHeight: 1.02,
              letterSpacing: "-3px",
              fontWeight: 950,
            }}
          >
            Market alışverişinde
            <span
              style={{
                display: "block",
                background:
                  "linear-gradient(90deg, #4ade80, #2dd4bf, #60a5fa)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              en iyi fiyatı bul.
            </span>
          </h1>

          <p
            style={{
              maxWidth: "650px",
              margin: "24px auto 0",
              color: "#cbd5e1",
              fontSize: "18px",
              lineHeight: 1.7,
            }}
          >
            Ürün ara veya barkod okut. Market fiyatlarını karşılaştır,
            en ucuz seçeneği bul ve alışverişinde daha az öde.
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "10px",
              maxWidth: "720px",
              margin: "34px auto 0",
              padding: "8px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "18px",
              backgroundColor: "rgba(15, 23, 42, 0.76)",
              boxShadow: "0 22px 70px rgba(0, 0, 0, 0.3)",
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün adı veya barkod yazın"
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
              style={{
                padding: "0 22px",
                border: "none",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #22c55e, #14b8a6)",
                color: "#052e16",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Ara
            </button>
          </form>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            <Link
              href="/scanner"
              style={{
                padding: "13px 18px",
                borderRadius: "12px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              📷 Barkod Tara
            </Link>

            <a
              href="#kategoriler"
              style={{
                padding: "13px 18px",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "12px",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Kategorileri Keşfet
            </a>
          </div>
        </div>
      </section>

      <section
        id="kategoriler"
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "28px 0 58px",
        }}
      >
        <div
          style={{
            marginBottom: "22px",
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
            Kategoriler
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: "32px",
              letterSpacing: "-1px",
            }}
          >
            İhtiyacın olanı hızlıca bul
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {categories.map((category) => (
            <article
              key={category.name}
              style={{
                padding: "22px",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "18px",
                backgroundColor: "rgba(15, 23, 42, 0.72)",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                }}
              >
                {category.icon}
              </div>

              <h3
                style={{
                  margin: "16px 0 6px",
                  fontSize: "20px",
                }}
              >
                {category.name}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  lineHeight: 1.6,
                }}
              >
                {category.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "10px 0 70px",
        }}
      >
        <div
          style={{
            padding: "28px",
            border: "1px solid rgba(148, 163, 184, 0.16)",
            borderRadius: "22px",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.82))",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                style={{
                  padding: "18px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(2, 6, 23, 0.5)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "12px",
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    color: "#86efac",
                    fontSize: "22px",
                    fontWeight: 900,
                  }}
                >
                  {benefit.icon}
                </div>

                <h3
                  style={{
                    margin: "16px 0 8px",
                    fontSize: "19px",
                  }}
                >
                  {benefit.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                    lineHeight: 1.65,
                  }}
                >
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(148, 163, 184, 0.12)",
          backgroundColor: "rgba(2, 6, 23, 0.72)",
        }}
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 32px))",
            margin: "0 auto",
            padding: "24px 0",
            color: "#64748b",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          OpportunityOS · Akıllı fiyat karşılaştırma
        </div>
      </footer>
    </main>
  );
}