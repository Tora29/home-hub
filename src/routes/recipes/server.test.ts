/**
 * @file テスト: Recipes API ハンドラ
 * @module src/routes/recipes/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-108, AC-109, AC-113
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GET, POST } from './+server';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('./service', () => ({
	getRecipes: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
	createRecipe: vi.fn()
}));

function createGetEvent(searchParams: Record<string, string> = {}) {
	const params = new URLSearchParams(searchParams);
	const url = new URL(`http://localhost/recipes?${params}`);
	return {
		request: new Request(url),
		url,
		locals: { user: { id: 'user-1' }, session: null },
		params: {},
		platform: { env: { DB: {} } }
	} as Parameters<typeof GET>[0];
}

function createPostEvent(body: unknown) {
	const url = new URL('http://localhost/recipes');
	return {
		request: new Request(url, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		}),
		url,
		locals: { user: { id: 'user-1' }, session: null },
		params: {},
		platform: { env: { DB: {} } }
	} as Parameters<typeof POST>[0];
}

describe('GET /recipes', () => {
	describe('sort バリデーション', () => {
		it('[SPEC: AC-113] 定義外の sort 値を指定した場合 400 VALIDATION_ERROR を返す', async () => {
			const { GET } = await import('./+server');
			const event = createGetEvent({ sort: 'invalid_sort' });
			const response = await GET(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});
	});
});

describe('POST /recipes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('name バリデーション', () => {
		it('[SPEC: AC-101] name が空の場合 400 VALIDATION_ERROR「レシピ名は必須です」を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: '' });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'name', message: 'レシピ名は必須です' })
				])
			);
		});

		it('[SPEC: AC-102] name が 101 文字以上の場合 400 VALIDATION_ERROR「100 文字以内で入力してください」を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'a'.repeat(101) });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'name', message: '100 文字以内で入力してください' })
				])
			);
		});
	});

	describe('description バリデーション', () => {
		it('[SPEC: AC-103] description が 501 文字以上の場合 400 VALIDATION_ERROR を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', description: 'a'.repeat(501) });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'description' })])
			);
		});
	});

	describe('memo バリデーション', () => {
		it('[SPEC: AC-104] memo が 1001 文字以上の場合 400 VALIDATION_ERROR を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', memo: 'a'.repeat(1001) });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'memo' })])
			);
		});
	});

	describe('rating バリデーション', () => {
		it('[SPEC: AC-105] rating に定義外の値を指定した場合 400 VALIDATION_ERROR を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', rating: 'bad' });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'rating' })])
			);
		});
	});

	describe('difficulty バリデーション', () => {
		it('[SPEC: AC-106] difficulty に定義外の値を指定した場合 400 VALIDATION_ERROR を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', difficulty: 'impossible' });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'difficulty' })])
			);
		});
	});

	describe('servings バリデーション', () => {
		it('[SPEC: AC-108] servings が 0 の場合 400 VALIDATION_ERROR「1 以上の値を入力してください」を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', servings: 0 });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'servings' })])
			);
		});
	});

	describe('cookingTimeMinutes バリデーション', () => {
		it('[SPEC: AC-109] cookingTimeMinutes が 0 の場合 400 VALIDATION_ERROR「1 以上の値を入力してください」を返す', async () => {
			const { POST } = await import('./+server');
			const event = createPostEvent({ name: 'テストレシピ', cookingTimeMinutes: 0 });
			const response = await POST(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'cookingTimeMinutes' })])
			);
		});
	});
});
