import { ConsoleLogger } from "../logger";
import { A101Provider } from "../providers/a101Provider";
import { AmazonProvider } from "../providers/amazonProvider";
import { BIMProvider } from "../providers/bimProvider";
import { CarrefourProvider } from "../providers/carrefourProvider";
import { MigrosProvider } from "../providers/migrosProvider";
import { SOKProvider } from "../providers/sokProvider";
import { TrendyolProvider } from "../providers/trendyolProvider";
import type { ProviderConfig } from "../providers/interfaces";
import type { DataProvider } from "../providers/interfaces";

export class ProviderRegistry {
  constructor(private readonly logger = new ConsoleLogger()) {}

  createProviders(configs: ProviderConfig[]): DataProvider[] {
    const providers: DataProvider[] = [];

    for (const config of configs) {
      if (!config.enabled) {
        continue;
      }

      switch (config.name) {
        case "migros":
          providers.push(new MigrosProvider(config));
          break;
        case "a101":
          providers.push(new A101Provider(config));
          break;
        case "bim":
          providers.push(new BIMProvider(config));
          break;
        case "sok":
          providers.push(new SOKProvider(config));
          break;
        case "carrefour":
          providers.push(new CarrefourProvider(config));
          break;
        case "amazon":
          providers.push(new AmazonProvider(config));
          break;
        case "trendyol":
          providers.push(new TrendyolProvider(config));
          break;
        default:
          this.logger.warn("Unsupported provider configured", { provider: config.name });
      }
    }

    return providers;
  }
}
