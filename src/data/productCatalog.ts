import type { ProductSearchQuery, ProviderName } from "../types/collection";

export interface ProductCapture {
  id: string;
  name: string;
  barcode: string;
  unit: string;
  prices: Array<{
    provider: ProviderName;
    amount: number;
    currency: string;
    collectedAt: string;
  }>;
}

export const productCatalog: ProductCapture[] = [
  {
    id: "coca-cola-1l",
    name: "Coca Cola 1L",
    barcode: "8690504001234",
    unit: "1L",
    prices: [
      {
        provider: "bim",
        amount: 46.5,
        currency: "TRY",
        collectedAt: new Date().toISOString(),
      },
      {
        provider: "a101",
        amount: 47.9,
        currency: "TRY",
        collectedAt: new Date().toISOString(),
      },
      {
        provider: "sok",
        amount: 48.9,
        currency: "TRY",
        collectedAt: new Date().toISOString(),
      },
      {
        provider: "migros",
        amount: 49.95,
        currency: "TRY",
        collectedAt: new Date().toISOString(),
      },
      {
        provider: "tekel",
        amount: 55,
        currency: "TRY",
        collectedAt: new Date().toISOString(),
      },
    ],
  },
];

export const productSearchQueries: ProductSearchQuery[] = [
  {
    keyword: "Coca Cola 1L",
    category: "beverages",
    limit: 10,
  },
];
