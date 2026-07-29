import type { Logger } from "../logger";
import type { PriceDropNotification, PriceDropNotifier } from "./types";

export class PriceDropNotificationService implements PriceDropNotifier {
  constructor(private readonly logger: Logger) {}

  async notifyDrop(notification: PriceDropNotification): Promise<void> {
    this.logger.info("Price drop detected", {
      productId: notification.productId,
      provider: notification.provider,
      previousPrice: notification.previousPrice,
      currentPrice: notification.currentPrice,
      currency: notification.currency,
      collectedAt: notification.collectedAt,
    });
  }
}
