"use client";

import { useState } from "react";
import { testCatalogImport } from "../../src/services/catalog/testCatalogImport";

type CatalogTestResult = {
  success: boolean;
  error?: string;
  [key: string]: unknown;
};

export default function CatalogTestPage() {
  const [result, setResult] =
    useState<CatalogTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);

    try {
      const response = await testCatalogImport();
      setResult(response as CatalogTestResult);
    } catch (error: unknown) {
      console.error(error);

      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata oluştu.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "#111827",
        color: "#ffffff",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>
        🧪 Catalog Import Test
      </h1>

      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: "12px 20px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        {loading ? "Çalışıyor..." : "Testi Başlat"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            background: "#1f2937",
            color: "#f9fafb",
            border: "1px solid #374151",
            borderRadius: 8,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}