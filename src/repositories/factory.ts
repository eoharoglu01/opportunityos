import { isSupabaseConfigured, logSupabaseRuntimeMode } from "../lib/env";
import { MockProductRepository } from "./MockProductRepository";
import { MockStoreRepository } from "./MockStoreRepository";
import { MockOpportunityRepository } from "./MockOpportunityRepository";
import { SupabaseProductRepository } from "./supabase/SupabaseProductRepository";
import { SupabaseStoreRepository } from "./supabase/SupabaseStoreRepository";
import { SupabaseOpportunityRepository } from "./supabase/SupabaseOpportunityRepository";
import type { ProductRepository } from "./ProductRepository";
import type { StoreRepository } from "./StoreRepository";
import type { OpportunityRepository } from "./OpportunityRepository";

function shouldUseSupabase(): boolean {
  const useSupabase = isSupabaseConfigured();
  logSupabaseRuntimeMode();
  return useSupabase;
}

export function createProductRepository(): ProductRepository {
  return shouldUseSupabase() ? new SupabaseProductRepository() : new MockProductRepository();
}

export function createStoreRepository(): StoreRepository {
  return shouldUseSupabase() ? new SupabaseStoreRepository() : new MockStoreRepository();
}

export function createOpportunityRepository(): OpportunityRepository {
  return shouldUseSupabase() ? new SupabaseOpportunityRepository() : new MockOpportunityRepository();
}
