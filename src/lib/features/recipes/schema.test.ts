/**
 * @file テスト: レシピスキーマ
 * @module src/lib/features/recipes/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
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
	test('名前のみで登録できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'カレー' });
		expect(result.success).toBe(true);
	});

	test('全フィールドを指定して登録できる', () => {
		const result = recipeCreateSchema.safeParse({
			name: 'カレー',
			description: '定番カレー',
			servings: 4,
			cookingTimeMinutes: 30,
			rating: 'excellent',
			difficulty: 'easy',
			memo: 'じゃがいも多め',
			ingredients: [{ name: '玉ねぎ', amount: '1個' }],
			steps: ['玉ねぎを炒める']
		});
		expect(result.success).toBe(true);
	});

	test('レシピ名が空の場合、「レシピ名は必須です」エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('レシピ名は必須です');
	});

	test('レシピ名が100文字の場合、登録できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'a'.repeat(100) });
		expect(result.success).toBe(true);
	});

	test('レシピ名が101文字の場合、「100 文字以内で入力してください」エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'a'.repeat(101) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('100 文字以内で入力してください');
	});

	test('説明が500文字の場合、登録できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', description: 'a'.repeat(500) });
		expect(result.success).toBe(true);
	});

	test('説明が501文字の場合、「500 文字以内で入力してください」エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', description: 'a'.repeat(501) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('500 文字以内で入力してください');
	});

	test('servings が0の場合、エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', servings: 0 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('servings が1の場合、登録できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', servings: 1 });
		expect(result.success).toBe(true);
	});

	test('cookingTimeMinutes が0の場合、エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', cookingTimeMinutes: 0 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('1 以上の値を入力してください');
	});

	test('rating が無効値の場合、エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', rating: 'unknown' });
		expect(result.success).toBe(false);
	});

	test('difficulty が無効値の場合、エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', difficulty: 'very-hard' });
		expect(result.success).toBe(false);
	});

	test('memo が1000文字の場合、登録できる', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', memo: 'a'.repeat(1000) });
		expect(result.success).toBe(true);
	});

	test('memo が1001文字の場合、「1000 文字以内で入力してください」エラーが返る', () => {
		const result = recipeCreateSchema.safeParse({ name: 'テスト', memo: 'a'.repeat(1001) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('1000 文字以内で入力してください');
	});
});

describe('recipeUpdateSchema', () => {
	const validBase = { name: 'カレー', cookedCount: 0 };

	test('必須フィールドのみで更新できる', () => {
		const result = recipeUpdateSchema.safeParse(validBase);
		expect(result.success).toBe(true);
	});

	test('レシピ名が空の場合、「レシピ名は必須です」エラーが返る', () => {
		const result = recipeUpdateSchema.safeParse({ ...validBase, name: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('レシピ名は必須です');
	});

	test('cookedCount が-1の場合、「0 以上の値を入力してください」エラーが返る', () => {
		const result = recipeUpdateSchema.safeParse({ ...validBase, cookedCount: -1 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('0 以上の値を入力してください');
	});

	test('cookedCount が0の場合、更新できる', () => {
		const result = recipeUpdateSchema.safeParse({ ...validBase, cookedCount: 0 });
		expect(result.success).toBe(true);
	});

	test('lastCookedAt が ISO datetime 形式の場合、更新できる', () => {
		const result = recipeUpdateSchema.safeParse({
			...validBase,
			lastCookedAt: '2024-01-15T12:00:00Z'
		});
		expect(result.success).toBe(true);
	});

	test('lastCookedAt が null の場合、更新できる', () => {
		const result = recipeUpdateSchema.safeParse({ ...validBase, lastCookedAt: null });
		expect(result.success).toBe(true);
	});

	test('description を null でクリアできる', () => {
		const result = recipeUpdateSchema.safeParse({ ...validBase, description: null });
		expect(result.success).toBe(true);
	});
});

describe('askSchema', () => {
	test('正しい質問でパースできる', () => {
		const result = askSchema.safeParse({ question: '今日の夕飯は何がいいですか？' });
		expect(result.success).toBe(true);
	});

	test('質問が空の場合、「質問を入力してください」エラーが返る', () => {
		const result = askSchema.safeParse({ question: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('質問を入力してください');
	});

	test('質問が500文字の場合、パースできる', () => {
		const result = askSchema.safeParse({ question: 'a'.repeat(500) });
		expect(result.success).toBe(true);
	});

	test('質問が501文字の場合、「500 文字以内で入力してください」エラーが返る', () => {
		const result = askSchema.safeParse({ question: 'a'.repeat(501) });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('500 文字以内で入力してください');
	});
});

describe('extractSchema', () => {
	test('正しいテキストでパースできる', () => {
		const result = extractSchema.safeParse({ text: 'レシピのテキスト' });
		expect(result.success).toBe(true);
	});

	test('テキストが空の場合、「テキストは必須です」エラーが返る', () => {
		const result = extractSchema.safeParse({ text: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('テキストは必須です');
	});
});

describe('listRecipesQuerySchema', () => {
	test('パラメータなしでデフォルト値を適用できる', () => {
		const result = listRecipesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(1);
		expect(result.data?.limit).toBe(20);
		expect(result.data?.sort).toBe('createdAt_desc');
	});

	test('有効なソート値でパースできる', () => {
		const sorts = ['createdAt_desc', 'lastCookedAt_asc', 'cookedCount_desc', 'rating_desc'];
		for (const sort of sorts) {
			const result = listRecipesQuerySchema.safeParse({ sort });
			expect(result.success).toBe(true);
		}
	});

	test('無効なソート値の場合、エラーが返る', () => {
		const result = listRecipesQuerySchema.safeParse({ sort: 'name_asc' });
		expect(result.success).toBe(false);
	});

	test('page と limit の文字列を数値に変換できる', () => {
		const result = listRecipesQuerySchema.safeParse({ page: '2', limit: '50' });
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(2);
		expect(result.data?.limit).toBe(50);
	});

	test('limit が 101 の場合、エラーが返る', () => {
		const result = listRecipesQuerySchema.safeParse({ limit: '101' });
		expect(result.success).toBe(false);
	});
});
