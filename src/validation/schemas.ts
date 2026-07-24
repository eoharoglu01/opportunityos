import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
});

export const favoriteSchema = z.object({
  productId: z.string().min(1),
});

export const alertSchema = z.object({
  productId: z.string().min(1),
  targetPrice: z.number().nonnegative(),
  comparisonOperator: z.enum(["<=", ">=", "="]).default("<="),
});

export const notificationSchema = z.object({
  userId: z.string().min(1),
});
