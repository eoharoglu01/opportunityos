import type { ProviderName } from "../types/collection";

export interface BimProductPayload {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  price?: number;
  currency?: string;
  unit?: string;
  available?: boolean;
}

export interface NormalizedBimProduct {
  id: string;
  provider: ProviderName;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number;
  currency?: string;
  unit?: string;
  available?: boolean;
  raw: BimProductPayload;
}

export class BimParser {
  parse(payload: BimProductPayload): NormalizedBimProduct {
    return {
      id: payload.id,
      provider: "bim",
      name: payload.name,
      brand: payload.brand,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      currency: payload.currency ?? "TRY",
      unit: payload.unit,
      available: payload.available ?? true,
      raw: payload,
    };
  }
}
