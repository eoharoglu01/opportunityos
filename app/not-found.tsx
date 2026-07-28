import Link from "next/link";
export default function NotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "#f8fafc", textAlign: "center", padding: 24 }}><div><h1>404 — Sayfa bulunamadı</h1><p style={{ color: "#94a3b8" }}>Aradığın sayfa taşınmış veya kaldırılmış olabilir.</p><Link href="/" style={{ color: "#4ade80" }}>Ana sayfaya dön</Link></div></main>;
}
