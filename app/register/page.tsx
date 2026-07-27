"use client";

import { useState } from "react";
import { authService } from "../../src/services/auth/AuthService";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await authService.signUp({
        fullName,
        email,
        password,
      });

      setMessage(
        "✅ Kayıt başarılı! E-postanı kontrol ederek hesabını doğrulayabilirsin.",
      );

      setFullName("");
      setEmail("");
      setPassword("");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "60px auto",
        padding: 24,
      }}
    >
      <h1>Kayıt Ol</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: 24,
        }}
      >
        <input
          placeholder="Ad Soyad"
          value={fullName}
          onChange={(event) =>
            setFullName(event.target.value)
          }
          required
        />

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kayıt Ol"}
        </button>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}
      </form>
    </main>
  );
}