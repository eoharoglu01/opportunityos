"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("OpportunityOS error", error.digest ?? error.message); }, [error]);
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#020617", color: "#f8fafc" }}>
      <section style={{ maxWidth: 560, textAlign: "center" }}>
        <h1>Bir şeyler ters gitti</h1>
        <p style={{ color: "#94a3b8" }}>İşlem tamamlanamadı. Tekrar deneyebilir veya ana sayfaya dönebilirsin.</p>
        <button onClick={reset} style={{ padding: "12px 18px", borderRadius: 10, border: 0, fontWeight: 800 }}>Tekrar Dene</button>
      </section>
    </main>
  );
}
