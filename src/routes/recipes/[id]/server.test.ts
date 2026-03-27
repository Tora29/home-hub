/**
 * @file テスト: Recipes [id] API ハンドラ
 * @module src/routes/recipes/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-107, AC-108, AC-109, AC-110
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '$lib/server/errors';
import type { PUT, DELETE } from './+server';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('../service', () => ({
	getRecipeById: vi.fn(),
	updateRecipe: vi.fn(),
	deleteRecipe: vi.fn()
}));

const EXISTING_ID = 'existing-recipe-id';
const NOT_FOUND_ID = 'nonexistent-recipe-id';

function createPutEvent(id: string, body: unknown) {
	const url = new URL(`http://localhost/recipes/${id}`);
	return {
		request: new Request(url, {
			method: 'PUT',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		}),
		url,
		locals: { user: { id: 'user-1' }, session: null },
		params: { id },
		platform: { env: { DB: {} } }
	} as Parameters<typeof PUT>[0];
}

function createDeleteEvent(id: string) {
	const url = new URL(`http://localhost/recipes/${id}`);
	return {
		request: new Request(url, { method: 'DELETE' }),
		url,
		locals: { user: { id: 'user-1' }, session: null },
		params: { id },
		platform: { env: { DB: {} } }
	} as Parameters<typeof DELETE>[0];
}

const validUpdateBody = {
	name: 'テストレシピ',
	cookedCount: 0
};

describe('PUT /recipes/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('name バリデーション', () => {
		it('[SPEC: AC-101] name が空の場合 400 VALIDATION_ERROR「レシピ名は必須です」を返す', async () => {
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, name: '' });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, name: 'a'.repeat(101) });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, {
				...validUpdateBody,
				description: 'a'.repeat(501)
			});
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, memo: 'a'.repeat(1001) });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, rating: 'bad' });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, difficulty: 'impossible' });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, servings: 0 });
			const response = await PUT(event);
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
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, cookingTimeMinutes: 0 });
			const response = await PUT(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'cookingTimeMinutes' })])
			);
		});
	});

	describe('cookedCount バリデーション', () => {
		it('[SPEC: AC-110] cookedCount が負の値の場合 400 VALIDATION_ERROR「0 以上の値を入力してください」を返す', async () => {
			const { PUT } = await import('./+server');
			const event = createPutEvent(EXISTING_ID, { ...validUpdateBody, cookedCount: -1 });
			const response = await PUT(event);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toEqual(
				expect.arrayContaining([expect.objectContaining({ field: 'cookedCount' })])
			);
		});
	});

	describe('NOT_FOUND', () => {
		it('[SPEC: AC-107] 存在しない ID に対して PUT した場合 404 NOT_FOUND を返す', async () => {
			const { updateRecipe } = await import('../service');
			vi.mocked(updateRecipe).mockRejectedValue(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);
			const { PUT } = await import('./+server');
			const event = createPutEvent(NOT_FOUND_ID, validUpdateBody);
			const response = await PUT(event);
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
		});
	});
});

describe('DELETE /recipes/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('NOT_FOUND', () => {
		it('[SPEC: AC-107] 存在しない ID に対して DELETE した場合 404 NOT_FOUND を返す', async () => {
			const { deleteRecipe } = await import('../service');
			vi.mocked(deleteRecipe).mockRejectedValue(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);
			const { DELETE } = await import('./+server');
			const event = createDeleteEvent(NOT_FOUND_ID);
			const response = await DELETE(event);
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
		});
	});
});
