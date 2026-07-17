/**
 * @file 型定義: Recipe 共有型
 * @module src/lib/features/recipes/types.ts
 * @feature recipes
 *
 * @description
 * レシピ機能で service・API・コンポーネント間で共有する型定義。
 * サーバー依存なしの純粋な型ファイル。
 */

export type Ingredient = {
	name: string;
	amount?: string;
};

export type Recipe = {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	r2ImageKey: string | null;
	ingredients: Ingredient[] | null;
	steps: string[] | null;
	sourceUrl: string | null;
	servings: number | null;
	cookingTimeMinutes: number | null;
	cookedCount: number;
	lastCookedAt: Date | null;
	rating: string | null;
	difficulty: string | null;
	memo: string | null;
	createdAt: Date;
	updatedAt: Date;
};
