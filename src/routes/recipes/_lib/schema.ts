/**
 * @file スキーマ: Recipe
 * @module src/routes/recipes/_lib/schema.ts
 * @feature recipes
 *
 * @description
 * レシピ機能の Zod バリデーションスキーマ。FE/BE 共通で使用する。
 *
 * @spec specs/recipes/spec.md - Schema セクション
 *
 * @schemas
 * - recipeCreateSchema      - 登録用入力
 * - recipeUpdateSchema      - 更新用入力（PUT）
 * - askSchema               - AI 献立相談入力
 * - extractSchema           - AI レシピ抽出入力
 * - listRecipesQuerySchema  - 一覧取得クエリパラメータ
 *
 * @types
 * - RecipeCreate     - 登録用入力型
 * - RecipeUpdate     - 更新用入力型
 * - AskRequest       - AI 相談入力型
 * - ExtractRequest   - AI 抽出入力型
 * - ListRecipesQuery - 一覧クエリ型
 */
import { z } from 'zod';

const ingredientSchema = z.object({
	name: z.string(),
	amount: z.string().optional()
});

const ratingSchema = z.enum(['excellent', 'good', 'average', 'poor']);
const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const recipeCreateSchema = z.object({
	name: z.string().min(1, 'レシピ名は必須です').max(100, '100 文字以内で入力してください'),
	description: z.string().max(500, '500 文字以内で入力してください').optional(),
	imageUrl: z.string().optional(),
	r2ImageKey: z.string().optional(),
	ingredients: z.array(ingredientSchema).optional(),
	steps: z.array(z.string()).optional(),
	sourceUrl: z.string().optional(),
	servings: z.number().int().min(1, '1 以上の値を入力してください').optional(),
	cookingTimeMinutes: z.number().int().min(1, '1 以上の値を入力してください').optional(),
	rating: ratingSchema.optional(),
	difficulty: difficultySchema.optional(),
	memo: z.string().max(1000, '1000 文字以内で入力してください').optional()
});

export const recipeUpdateSchema = z.object({
	name: z.string().min(1, 'レシピ名は必須です').max(100, '100 文字以内で入力してください'),
	cookedCount: z.number().int().min(0, '0 以上の値を入力してください'),
	description: z.string().max(500, '500 文字以内で入力してください').nullable().optional(),
	imageUrl: z.string().nullable().optional(),
	r2ImageKey: z.string().nullable().optional(),
	ingredients: z.array(ingredientSchema).nullable().optional(),
	steps: z.array(z.string()).nullable().optional(),
	sourceUrl: z.string().nullable().optional(),
	servings: z.number().int().min(1, '1 以上の値を入力してください').nullable().optional(),
	cookingTimeMinutes: z.number().int().min(1, '1 以上の値を入力してください').nullable().optional(),
	lastCookedAt: z.string().datetime().nullable().optional(),
	rating: ratingSchema.nullable().optional(),
	difficulty: difficultySchema.nullable().optional(),
	memo: z.string().max(1000, '1000 文字以内で入力してください').nullable().optional()
});

export const askSchema = z.object({
	question: z.string().min(1, '質問を入力してください').max(500, '500 文字以内で入力してください')
});

export const extractSchema = z.object({
	text: z.string().min(1, 'テキストは必須です')
});

export const listRecipesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	sort: z
		.enum(['createdAt_desc', 'lastCookedAt_asc', 'cookedCount_desc', 'rating_desc'])
		.default('createdAt_desc')
});

export type RecipeCreate = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdate = z.infer<typeof recipeUpdateSchema>;
export type AskRequest = z.infer<typeof askSchema>;
export type ExtractRequest = z.infer<typeof extractSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
