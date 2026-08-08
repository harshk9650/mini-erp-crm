import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(6, "Mobile number is required"),
  email: z.string().email().optional().or(z.literal("")).optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]).default("RETAIL"),
  address: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).default("LEAD"),
  followUpDate: z.string().datetime().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerNoteSchema = z.object({
  note: z.string().min(1, "Note text is required"),
});

export const productCreateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  currentStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "Reason is required"),
});

export const challanItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const challanCreateSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemSchema).min(1, "At least one product line item is required"),
});
