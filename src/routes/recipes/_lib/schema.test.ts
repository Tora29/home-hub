/**
 * @file テスト: recipes スキーマ
 * @module src/routes/recipes/_lib/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/recipes/spec.md
 * @covers AC-001, AC-002, AC-004, AC-006, AC-008, AC-009, AC-010, AC-011, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-108, AC-109, AC-110, AC-111, AC-112, AC-113, AC-114, AC-201, AC-202, AC-203, AC-205, AC-206
 */

import { describe, test, expect } from 'vitest';
import {
	recipeCreateSchema,
	recipeUpdateSchema,
	askSchema,
	extractSchema,
	listRecipesQuerySchema
} from './schema';

describe('recipeCreateSchema', () => {
	test('[SPEC: AC-002] 必須フィールド（name のみ）で parse できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー' });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-101] name が空の場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('レシピ名は必須です');
	});

	test('[SPEC: AC-102] name が 101 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'a'.repeat(101) });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('100 文字以内で入力してください');
	});

	test('[SPEC: AC-103] description が 501 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({
			name: 'カレー',
			description: 'a'.repeat(501)
		});
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('500 文字以内で入力してください');
	});

	test('[SPEC: AC-104] memo が 1001 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({
			name: 'カレー',
			memo: 'a'.repeat(1001)
		});
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1000 文字以内で入力してください');
	});

	test('[SPEC: AC-105] rating に定義外の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', rating: 'bad' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-105] rating に excellent/good/average/poor は parse できる', () => {
		for (const rating of ['excellent', 'good', 'average', 'poor']) {
			const result = recipeCreateSchema.safeParse({ name: 'カレー', rating });
			expect(result.success).toBe(true);
		}
	});

	test('[SPEC: AC-106] difficulty に定義外の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', difficulty: 'normal' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-106] difficulty に easy/medium/hard は parse できる', () => {
		for (const difficulty of ['easy', 'medium', 'hard']) {
			const result = recipeCreateSchema.safeParse({ name: 'カレー', difficulty });
			expect(result.success).toBe(true);
		}
	});

	test('[SPEC: AC-108] servings に 0 を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', servings: 0 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-108] servings に負の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', servings: -1 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-109] cookingTimeMinutes に 0 を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', cookingTimeMinutes: 0 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-109] cookingTimeMinutes に負の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', cookingTimeMinutes: -5 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-201] name が 100 文字の場合は parse できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'a'.repeat(100) });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-202] description が 500 文字の場合は parse できる', () => {
		const result = recipeCreateSchema.safeParse({
			name: 'カレー',
			description: 'a'.repeat(500)
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-203] memo が 1000 文字の場合は parse できる', () => {
		const result = recipeCreateSchema.safeParse({
			name: 'カレー',
			memo: 'a'.repeat(1000)
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-205] servings が 1 の場合は parse できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー', servings: 1 });
		expect(result.success).toBe(true);
	});
});

describe('recipeUpdateSchema', () => {
	const base = { name: 'カレー', cookedCount: 0 };

	test('[SPEC: AC-004] 必須フィールド（name, cookedCount）で parse できる', () => {
		const result = recipeUpdateSchema.safeParse(base);
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-101] name が空の場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, name: '' });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('レシピ名は必須です');
	});

	test('[SPEC: AC-102] name が 101 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, name: 'a'.repeat(101) });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('100 文字以内で入力してください');
	});

	test('[SPEC: AC-103] description が 501 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, description: 'a'.repeat(501) });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('500 文字以内で入力してください');
	});

	test('[SPEC: AC-104] memo が 1001 文字の場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, memo: 'a'.repeat(1001) });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1000 文字以内で入力してください');
	});

	test('[SPEC: AC-105] rating に定義外の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, rating: 'super' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-106] difficulty に定義外の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, difficulty: 'veryhard' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-108] servings に 0 を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, servings: 0 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-109] cookingTimeMinutes に 0 を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, cookingTimeMinutes: 0 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('[SPEC: AC-110] cookedCount に負の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, cookedCount: -1 });
		expect(result.success).toBe(false);
		expect(result.error!.issues[0].message).toBe('0 以上の値を入力してください');
	});

	test('[SPEC: AC-206] cookedCount が 0 の場合は parse できる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, cookedCount: 0 });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-205] servings が 1 の場合は parse できる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, servings: 1 });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-201] name が 100 文字の場合は parse できる', () => {
		const result = recipeUpdateSchema.safeParse({ ...base, name: 'a'.repeat(100) });
		expect(result.success).toBe(true);
	});
});

describe('askSchema', () => {
	test('[SPEC: AC-006] 正しい question は parse できる', () => {
		const result = askSchema.safeParse({ question: '今日は何を食べようかな' });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-111] question が空の場合は VALIDATION_ERROR になる', () => {
		const result = askSchema.safeParse({ question: '' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-112] question が 501 文字の場合は VALIDATION_ERROR になる', () => {
		const result = askSchema.safeParse({ question: 'a'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-112] question が 500 文字の場合は parse できる', () => {
		const result = askSchema.safeParse({ question: 'a'.repeat(500) });
		expect(result.success).toBe(true);
	});
});

describe('extractSchema', () => {
	test('[SPEC: AC-011] 正しい text は parse できる', () => {
		const result = extractSchema.safeParse({
			text: 'カレーの作り方。材料：カレールー、じゃがいも'
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-114] text が空の場合は VALIDATION_ERROR になる', () => {
		const result = extractSchema.safeParse({ text: '' });
		expect(result.success).toBe(false);
	});
});

describe('listRecipesQuerySchema', () => {
	test('[SPEC: AC-001] sort が未指定の場合はデフォルト値（createdAt_desc）が設定される', () => {
		const result = listRecipesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data!.sort).toBe('createdAt_desc');
	});

	test('[SPEC: AC-001] sort に createdAt_desc を指定できる', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'createdAt_desc' });
		expect(result.success).toBe(true);
		expect(result.data!.sort).toBe('createdAt_desc');
	});

	test('[SPEC: AC-008] sort に lastCookedAt_asc を指定できる', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'lastCookedAt_asc' });
		expect(result.success).toBe(true);
		expect(result.data!.sort).toBe('lastCookedAt_asc');
	});

	test('[SPEC: AC-009] sort に cookedCount_desc を指定できる', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'cookedCount_desc' });
		expect(result.success).toBe(true);
		expect(result.data!.sort).toBe('cookedCount_desc');
	});

	test('[SPEC: AC-010] sort に rating_desc を指定できる', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'rating_desc' });
		expect(result.success).toBe(true);
		expect(result.data!.sort).toBe('rating_desc');
	});

	test('[SPEC: AC-113] sort に定義外の値を指定した場合は VALIDATION_ERROR になる', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'name_asc' });
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-001] page が未指定の場合はデフォルト値（1）が設定される', () => {
		const result = listRecipesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data!.page).toBe(1);
	});

	test('[SPEC: AC-001] limit が未指定の場合はデフォルト値（20）が設定される', () => {
		const result = listRecipesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data!.limit).toBe(20);
	});
});
