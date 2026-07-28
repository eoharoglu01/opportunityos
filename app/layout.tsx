import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: "OpportunityOS | Akıllı Market Fiyat Karşılaştırma", template: "%s | OpportunityOS" },
  description: "Market fiyatlarını karşılaştır, barkodla ürün bul ve Akıllı Sepet ile en uygun alışveriş planını oluştur.",
  applicationName: "OpportunityOS",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "tr_TR", url: baseUrl, siteName: "OpportunityOS", title: "OpportunityOS", description: "Akıllı market fiyat karşılaştırma platformu" },
  twitter: { card: "summary_large_image", title: "OpportunityOS", description: "Akıllı market fiyat karşılaştırma platformu" },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#0f172a", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}><body className="min-h-full flex flex-col">{children}</body></html>;
}
