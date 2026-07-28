import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "OpportunityOS", short_name: "OpportunityOS", description: "Akıllı market fiyat karşılaştırma platformu", start_url: "/", display: "standalone", background_color: "#020617", theme_color: "#0f172a", lang: "tr" };
}
