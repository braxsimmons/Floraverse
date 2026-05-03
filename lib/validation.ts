import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/i, "Letters, numbers, underscores only");

export const signupSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
  username: usernameSchema,
  name: z.string().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const noteSchema = z.object({
  content: z.string().min(1).max(280),
  recipientUsername: usernameSchema,
});

export const careActionSchema = z.object({
  userPlantId: z.string().min(1),
});

export const plantSeedSchema = z.object({
  shopItemId: z.string().min(1),
  x: z.number().int().min(0).max(99),
  y: z.number().int().min(0).max(99),
});

export const placeDecorSchema = z.object({
  shopItemId: z.string().min(1),
  x: z.number().int().min(0).max(99),
  y: z.number().int().min(0).max(99),
});

export const moveSlotSchema = z.object({
  fromX: z.number().int().min(0).max(99),
  fromY: z.number().int().min(0).max(99),
  toX: z.number().int().min(0).max(99),
  toY: z.number().int().min(0).max(99),
});
