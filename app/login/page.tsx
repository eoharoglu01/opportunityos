"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authService } from "../../src/services/auth/AuthService";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      await authService.signIn({
        email,
        password,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Giriş yapılırken bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "24px",
          background: "rgba(15, 23, 42, 0.82)",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>Giriş Yap</h1>

        <p
          style={{
            marginBottom: "24px",
            color: "#94a3b8",
          }}
        >
          Favorilerini ve fiyat alarmlarını yönetmek için hesabına giriş yap.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          {message && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "#fca5a5",
              }}
            >
              {message}
            </p>
          )}
        </form>

        <p
          style={{
            marginTop: "20px",
            color: "#94a3b8",
          }}
        >
          Hesabın yok mu?{" "}
          <Link href="/register" style={{ color: "#34d399" }}>
            Kayıt ol
          </Link>
        </p>
      </section>
    </main>
  );
}