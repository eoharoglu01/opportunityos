import { catalogImportService } from "./CatalogImportService";
import { sampleCatalog } from "./sampleCatalog";

export async function testCatalogImport() {
  console.log("=== Katalog İçe Aktarma Testi Başladı ===");

  const result = await catalogImportService.importProducts(sampleCatalog);

  console.log("Sonuç:", result);

  return result;
}