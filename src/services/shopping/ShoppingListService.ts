import { supabase } from "../../lib/supabase";

export type ShoppingList = {
  id: number;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShoppingListItem = {
  id: number;
  list_id: number;
  user_id: string;
  product_name: string;
  barcode: string | null;
  image_url: string | null;
  quantity: number;
  unit: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ShoppingListWithItems =
  ShoppingList & {
    items: ShoppingListItem[];
  };

export type AddShoppingListItemInput = {
  listId: number;
  productName: string;
  barcode?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unit: string;
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
    error.code
      ? `Kod: ${error.code}`
      : undefined,
  ].filter(Boolean);

  return new Error(
    parts.length > 0
      ? parts.join(" — ")
      : fallbackMessage,
  );
}

export class ShoppingListService {
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

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) {
      throw createServiceError(
        sessionError,
        "Kullanıcı oturumu kontrol edilemedi.",
      );
    }

    if (session?.user) {
      return session.user;
    }

    const {
      data: {
        session: refreshedSession,
      },
      error: refreshError,
    } =
      await client.auth.refreshSession();

    if (refreshError) {
      throw createServiceError(
        refreshError,
        "Kullanıcı oturumu yenilenemedi.",
      );
    }

    if (refreshedSession?.user) {
      return refreshedSession.user;
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError) {
      throw createServiceError(
        userError,
        "Kullanıcı bilgisi alınamadı.",
      );
    }

    if (!user) {
      throw new Error(
        "Bu işlem için giriş yapmalısınız.",
      );
    }

    return user;
  }

  async getLists(): Promise<
    ShoppingList[]
  > {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const { data, error } =
      await client
        .from("shopping_lists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw createServiceError(
        error,
        "Alışveriş listeleri yüklenemedi.",
      );
    }

    return (
      data ?? []
    ) as ShoppingList[];
  }

  async getListWithItems(
    listId: number,
  ): Promise<ShoppingListWithItems> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const {
      data: list,
      error: listError,
    } = await client
      .from("shopping_lists")
      .select("*")
      .eq("id", listId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (listError) {
      throw createServiceError(
        listError,
        "Alışveriş listesi yüklenemedi.",
      );
    }

    if (!list) {
      throw new Error(
        "Alışveriş listesi bulunamadı.",
      );
    }

    const {
      data: items,
      error: itemsError,
    } = await client
      .from("shopping_list_items")
      .select("*")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: true,
      });

    if (itemsError) {
      throw createServiceError(
        itemsError,
        "Alışveriş listesi ürünleri yüklenemedi.",
      );
    }

    return {
      ...(list as ShoppingList),
      items: (
        items ?? []
      ) as ShoppingListItem[],
    };
  }

  async createList(
    name: string,
  ): Promise<ShoppingList> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const cleanedName =
      name.trim() ||
      "Alışveriş Listem";

    const { data, error } =
      await client
        .from("shopping_lists")
        .insert({
          user_id: user.id,
          name: cleanedName,
          is_active: true,
          updated_at:
            new Date().toISOString(),
        } as never)
        .select("*")
        .single();

    if (error) {
      throw createServiceError(
        error,
        "Alışveriş listesi oluşturulamadı.",
      );
    }

    if (!data) {
      throw new Error(
        "Alışveriş listesi oluşturulamadı.",
      );
    }

    return data as ShoppingList;
  }

  async addItem(
    input: AddShoppingListItemInput,
  ): Promise<ShoppingListItem> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const productName =
      input.productName.trim();

    const unit =
      input.unit.trim() || "adet";

    if (!productName) {
      throw new Error(
        "Ürün adı boş bırakılamaz.",
      );
    }

    if (
      !Number.isFinite(
        input.quantity,
      ) ||
      input.quantity <= 0
    ) {
      throw new Error(
        "Miktar sıfırdan büyük olmalıdır.",
      );
    }

    const { data, error } =
      await client
        .from(
          "shopping_list_items",
        )
        .insert({
          list_id: input.listId,
          user_id: user.id,
          product_name:
            productName,
          barcode:
            input.barcode?.trim() ||
            null,
          image_url:
            input.imageUrl?.trim() ||
            null,
          quantity:
            input.quantity,
          unit,
          is_completed: false,
          updated_at:
            new Date().toISOString(),
        } as never)
        .select("*")
        .single();

    if (error) {
      throw createServiceError(
        error,
        "Ürün alışveriş listesine eklenemedi.",
      );
    }

    if (!data) {
      throw new Error(
        "Ürün alışveriş listesine eklenemedi.",
      );
    }

    return data as ShoppingListItem;
  }

  async updateItemCompletion(
    itemId: number,
    isCompleted: boolean,
  ): Promise<void> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const { error } =
      await client
        .from(
          "shopping_list_items",
        )
        .update({
          is_completed:
            isCompleted,
          updated_at:
            new Date().toISOString(),
        } as never)
        .eq("id", itemId)
        .eq("user_id", user.id);

    if (error) {
      throw createServiceError(
        error,
        "Ürün durumu güncellenemedi.",
      );
    }
  }

  async removeItem(
    itemId: number,
  ): Promise<void> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const { error } =
      await client
        .from(
          "shopping_list_items",
        )
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

    if (error) {
      throw createServiceError(
        error,
        "Ürün alışveriş listesinden silinemedi.",
      );
    }
  }

  async removeList(
    listId: number,
  ): Promise<void> {
    const client = this.getClient();
    const user =
      await this.getAuthenticatedUser();

    const { error } =
      await client
        .from("shopping_lists")
        .delete()
        .eq("id", listId)
        .eq("user_id", user.id);

    if (error) {
      throw createServiceError(
        error,
        "Alışveriş listesi silinemedi.",
      );
    }
  }
}

export const shoppingListService =
  new ShoppingListService();