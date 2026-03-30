/**
 * @file テスト: API Expense カテゴリ 詳細
 * @module src/routes/expense/categories/[id]/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-107, AC-108, AC-109, AC-110
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as ErrorsModule from '$lib/server/errors';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('../service', () => ({
	updateCategory: vi.fn(),
	deleteCategory: vi.fn()
}));

vi.mock('$lib/server/errors', async (importOriginal) => {
	const actual = await importOriginal<typeof ErrorsModule>();
	return actual;
});

import { PUT, DELETE } from './+server';
import * as service from '../service';
import { AppError } from '$lib/server/errors';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };
const CATEGORY_ID = 'cat-id-1';

function makePutRequest(body: unknown): Request {
	return new Request(`http://localhost/expense/categories/${CATEGORY_ID}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeDeleteRequest(): Request {
	return new Request(`http://localhost/expense/categories/${CATEGORY_ID}`, {
		method: 'DELETE'
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('PUT /expense/categories/[id]', () => {
	describe('正常系', () => {
		it('[SPEC: AC-011] 有効なカテゴリ名で更新すると、200 を返す', async () => {
			const mockUpdated = {
				id: CATEGORY_ID,
				userId: 'user-1',
				name: '外食費',
				createdAt: new Date('2026-03-01T00:00:00.000Z')
			};
			vi.mocked(service.updateCategory).mockResolvedValueOnce(mockUpdated);

			const response = await PUT({
				request: makePutRequest({ name: '外食費' }),
				params: { id: CATEGORY_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('外食費');
		});
	});

	describe('異常系（バリデーション）', () => {
		it('[SPEC: AC-107] カテゴリ名が空の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ name: '' }),
				params: { id: CATEGORY_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.message).toBe('入力値が正しくありません');
			expect(body.fields).toContainEqual({ field: 'name', message: 'カテゴリ名は必須です' });
		});

		it('[SPEC: AC-108] カテゴリ名が51文字以上の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ name: 'あ'.repeat(51) }),
				params: { id: CATEGORY_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({
				field: 'name',
				message: '50文字以内で入力してください'
			});
		});

		it('[SPEC: AC-109] 存在しないカテゴリIDの場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.updateCategory).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await PUT({
				request: makePutRequest({ name: '新カテゴリ' }),
				params: { id: 'non-existent-id' },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});
	});
});

describe('DELETE /expense/categories/[id]', () => {
	describe('正常系', () => {
		it('[SPEC: AC-012] カテゴリに紐付く支出が0件の場合、204 を返す', async () => {
			vi.mocked(service.deleteCategory).mockResolvedValueOnce(undefined);

			const response = await DELETE({
				request: makeDeleteRequest(),
				params: { id: CATEGORY_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(204);
		});
	});

	describe('異常系', () => {
		it('[SPEC: AC-109] 存在しないカテゴリIDの場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.deleteCategory).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await DELETE({
				request: makeDeleteRequest(),
				params: { id: 'non-existent-id' },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});

		it('[SPEC: AC-110] カテゴリに紐付く支出が1件以上ある場合、409 CONFLICT を返す', async () => {
			vi.mocked(service.deleteCategory).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, 'このカテゴリは使用中のため削除できません')
			);

			const response = await DELETE({
				request: makeDeleteRequest(),
				params: { id: CATEGORY_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('このカテゴリは使用中のため削除できません');
		});
	});
});
