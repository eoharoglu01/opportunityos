type AlertPayload = {
  productId: string;
  targetPrice: number;
  comparisonOperator?: "<=" | ">=" | "=";
};

export class AlertService {
  async list(): Promise<AlertPayload[]> {
    return [];
  }

  async create(payload: AlertPayload): Promise<boolean> {
    return Boolean(payload.productId);
  }

  async remove(productId: string): Promise<boolean> {
    return Boolean(productId);
  }
}
