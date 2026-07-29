export type CollectedCatalogProduct = {
  storeName: string;
  productName: string;
  brand?: string;
  barcode?: string;
  price: number;
  currency: "TRY";
  sourceUrl: string;
  collectedAt: string;
};

export type CollectorOptions = {
  sourceUrl: string;
  maximumProductCount?: number;
  delayBetweenRequestsMs?: number;
};

export type CollectorResult = {
  success: boolean;
  storeName: string;
  sourceUrl: string;
  collectedCount: number;
  products: CollectedCatalogProduct[];
  errors: string[];
};

export interface MarketCollector {
  readonly storeName: string;

  collect(
    options: CollectorOptions,
  ): Promise<CollectorResult>;
}