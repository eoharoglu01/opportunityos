import { supabase } from "../../lib/supabase";

export type Favorite = {
  id: number;
  user_id: string;
  product_id: string;
  product_name: string;
  store: string | null;
  price: number | null;
  created_at: string;
};

export type AddFavoriteInput = {
  productId: string;
  productName: string;
  store?: string;
  price?: number;
};

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function createServiceError(
  error: SupabaseErrorLike,
  fallbackMessage: string,
): Error {
  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Kod: ${error.code}` : undefined,
  ].filter(Boolean);

  return new Error(
    parts.length > 0 ? parts.join(" — ") : fallbackMessage,
  );
}

export class FavoriteService {
  private getClient() {
    if (!supabase) {
      throw new Error(
        "Supabase yapılandırılmamış. .env.local dosyasını kontrol edin.",
      );
    }

    return supabase;
  }

  private async getAuthenticatedUser() {
    const client = this.getClient();

    const { data, error } = await client.auth.getSession();

    if (error) {
      throw createServiceError(
        error,
        "Kullanıcı oturumu kontrol edilemedi.",
      );
    }

    if (data.session?.user) {
      return data.session.user;
    }

    const { data: refreshedData, error: refreshError } =
      await client.auth.refreshSession();

    if (refreshError) {
      throw new Error("Bu işlem için yeniden giriş yapmalısınız.");
    }

    const user = refreshedData.session?.user;

    if (!user) {
      throw new Error("Bu işlem için giriş yapmalısınız.");
    }

    return user;
  }

  async getFavorites(): Promise<Favorite[]> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const { data, error } = await client
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw createServiceError(
        error,
        "Favoriler yüklenirken bir hata oluştu.",
      );
    }

    return (data ?? []) as Favorite[];
  }

  async addFavorite(input: AddFavoriteInput): Promise<Favorite> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const favoriteData = {
      user_id: user.id,
      product_id: String(input.productId),
      product_name: input.productName.trim(),
      store: input.store?.trim() || null,
      price:
        typeof input.price === "number" && Number.isFinite(input.price)
          ? input.price
          : null,
    };

    const { data, error } = await client
      .from("favorites")
      .upsert(favoriteData as never, {
        onConflict: "user_id,product_id",
      })
      .select("*")
      .single();

    if (error) {
      throw createServiceError(
        error,
        "Ürün favorilere eklenirken bir hata oluştu.",
      );
    }

    if (!data) {
      throw new Error("Favori kaydı oluşturulamadı.");
    }

    return data as Favorite;
  }

  async removeFavorite(productId: string): Promise<void> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const { error } = await client
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", String(productId));

    if (error) {
      throw createServiceError(
        error,
        "Ürün favorilerden kaldırılırken bir hata oluştu.",
      );
    }
  }

  async isFavorite(productId: string): Promise<boolean> {
    const client = this.getClient();

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError) {
      throw createServiceError(
        sessionError,
        "Kullanıcı oturumu kontrol edilemedi.",
      );
    }

    const user = sessionData.session?.user;

    if (!user) {
      return false;
    }

    const { data, error } = await client
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", String(productId))
      .maybeSingle();

    if (error) {
      throw createServiceError(
        error,
        "Favori durumu kontrol edilemedi.",
      );
    }

    return Boolean(data);
  }
}

export const favoriteService = new FavoriteService();