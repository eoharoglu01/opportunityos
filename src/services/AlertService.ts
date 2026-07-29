import { supabase } from "../lib/supabase";

export type PriceAlert = {
  id: number;
  user_id: string;
  product_id: string;
  product_name: string;
  store: string | null;
  current_price: number | null;
  target_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePriceAlertInput = {
  productId: string;
  productName: string;
  store?: string;
  currentPrice?: number;
  targetPrice: number;
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

export class AlertService {
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

    const user = data.session?.user;

    if (!user) {
      throw new Error("Bu işlem için giriş yapmalısınız.");
    }

    return user;
  }

  async getAlerts(): Promise<PriceAlert[]> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const { data, error } = await client
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw createServiceError(
        error,
        "Fiyat alarmları yüklenirken bir hata oluştu.",
      );
    }

    return (data ?? []) as PriceAlert[];
  }

  async createAlert(
    input: CreatePriceAlertInput,
  ): Promise<PriceAlert> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const alertData = {
      user_id: user.id,
      product_id: String(input.productId),
      product_name: input.productName.trim(),
      store: input.store?.trim() || null,
      current_price:
        typeof input.currentPrice === "number" &&
        Number.isFinite(input.currentPrice)
          ? input.currentPrice
          : null,
      target_price: input.targetPrice,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("price_alerts")
      .upsert(alertData as never, {
        onConflict: "user_id,product_id",
      })
      .select("*")
      .single();

    if (error) {
      throw createServiceError(
        error,
        "Fiyat alarmı oluşturulurken bir hata oluştu.",
      );
    }

    if (!data) {
      throw new Error("Fiyat alarmı oluşturulamadı.");
    }

    return data as PriceAlert;
  }

  async updateAlertStatus(
    alertId: number,
    isActive: boolean,
  ): Promise<void> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const { error } = await client
      .from("price_alerts")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", alertId)
      .eq("user_id", user.id);

    if (error) {
      throw createServiceError(
        error,
        "Fiyat alarmı güncellenirken bir hata oluştu.",
      );
    }
  }

  async removeAlert(alertId: number): Promise<void> {
    const client = this.getClient();
    const user = await this.getAuthenticatedUser();

    const { error } = await client
      .from("price_alerts")
      .delete()
      .eq("id", alertId)
      .eq("user_id", user.id);

    if (error) {
      throw createServiceError(
        error,
        "Fiyat alarmı silinirken bir hata oluştu.",
      );
    }
  }
}

export const alertService = new AlertService();