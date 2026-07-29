export class FavoriteService {
  async list(): Promise<string[]> {
    return [];
  }

  async add(productId: string): Promise<boolean> {
    return Boolean(productId);
  }

  async remove(productId: string): Promise<boolean> {
    return Boolean(productId);
  }
}
