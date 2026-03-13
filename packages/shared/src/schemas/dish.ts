/**
 * @file スキーマ: Dish
 * @module packages/shared/src/schemas/dish.ts
 *
 * @description
 * Dish エンティティの入出力スキーマ定義（FE・BE 共通）。
 *
 * @schemas
 * - dishCreateSchema - 作成用入力
 * - dishUpdateSchema - 更新用入力
 * - dishSchema       - 出力型
 *
 * @types
 * - DishCreate - 作成用入力型
 * - DishUpdate - 更新用入力型
 * - Dish       - 出力型
 */
import { z } from 'zod';

export const EffortEnum = z.enum(['EASY', 'HARD']);
export const CategoryEnum = z.enum(['MAIN', 'SIDE']);

export const dishCreateSchema = z.object({
  name: z.string().min(1, '料理名は必須です').max(100, '料理名は100文字以内で入力してください'),
  recipeUrl: z.url('URLの形式が正しくありません').optional().nullable(),
  recipeText: z.string().max(10000).optional().nullable(),
  effort: EffortEnum,
  category: CategoryEnum,
  tagIds: z.array(z.string()).default([]),
  cookedAt: z.iso.datetime().optional(),
});

export const dishUpdateSchema = dishCreateSchema.partial().extend({
  name: z.string().min(1, '料理名は必須です').max(100).optional(),
});

export const dishSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  recipeUrl: z.string().nullable(),
  recipeText: z.string().nullable(),
  effort: EffortEnum,
  category: CategoryEnum,
  cookedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })),
  createdBy: z.string(),
});

export type DishCreate = z.infer<typeof dishCreateSchema>;
export type DishUpdate = z.infer<typeof dishUpdateSchema>;
export type Dish = z.infer<typeof dishSchema>;
