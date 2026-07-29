import type { PriceChangeRecord } from "./types";
import type { PricePoint } from "../types/collection";

export class PriceChangeDetector {
  detect(previous: PricePoint | undefined, current: PricePoint): PriceChangeRecord | null {
    if (!previous) {
      return null;
    }

    const previousPrice = previous.amount;
    const currentPrice = current.amount;
    const delta = currentPrice - previousPrice;

    const direction = delta < 0 ? "down" : delta > 0 ? "up" : "same";

    return {
      id: `${current.productId ?? "product"}-${Date.now()}`,
      productId: current.productId ?? "unknown",
      provider: current.source,
      previousPrice,
      currentPrice,
      priceDelta: delta,
      direction,
      currency: current.currency,
      collectedAt: current.collectedAt,
    };
  }
}
