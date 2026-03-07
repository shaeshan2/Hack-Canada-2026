import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(5000),
  address: z.string().min(1, "Address is required").max(500),
  price: z.coerce.number().int().positive("Price must be positive"),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional().transform((v) => (v === "" ? undefined : v)),
  sqft: z.coerce.number().int().nonnegative().optional().nullable().or(z.undefined()),
  bedrooms: z.coerce.number().int().nonnegative().optional().nullable().or(z.undefined()),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable().or(z.undefined()),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable().or(z.undefined()),
  photoUrls: z.array(z.string().min(1)).optional().default([]),
});

export type CreateListingBody = z.infer<typeof createListingSchema>;

export const priceEstimateSchema = z.object({
  address: z.string().min(1, "Address is required"),
  sqft: z.number().nonnegative().optional().default(0),
  bedrooms: z.number().int().nonnegative().optional().default(0),
});

export const qrGenerateSchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
});

export const createMessageSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
  listingId: z.string().min(1, "listingId is required"),
  content: z.string().min(1, "Content is required").max(10000),
});

export const listingIdParamSchema = z.object({
  id: z.string().min(1, "Listing id is required"),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().positive().optional().default(10),
  price_min: z.coerce.number().int().nonnegative().optional(),
  price_max: z.coerce.number().int().nonnegative().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
});

export const messagesQuerySchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
  otherUserId: z.string().optional(),
});

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.flatten().fieldErrors;
  const msg = Object.values(first).flat().join(" ") || result.error.message;
  return { success: false, error: msg };
}

export function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(query);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.flatten().fieldErrors;
  const msg = Object.values(first).flat().join(" ") || result.error.message;
  return { success: false, error: msg };
}
