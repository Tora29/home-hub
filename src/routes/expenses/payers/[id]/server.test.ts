/**
 * @file テスト: API Expense 支払者 詳細
 * @module src/routes/expenses/payers/[id]/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-118, AC-119
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type * as ErrorsModule from '$lib/server/errors';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('../service', () => ({
	updatePayer: vi.fn(),
	deletePayer: vi.fn()
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
const PAYER_ID = 'payer-id-1';

function makePutRequest(body: unknown): Request {
	return new Request(`http://localhost/expenses/payers/${PAYER_ID}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeDeleteRequest(): Request {
	return new Request(`http://localhost/expenses/payers/${PAYER_ID}`, {
		method: 'DELETE'
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('PUT /expenses/payers/[id]', () => {
	describe('正常系', () => {
		test('[SPEC: AC-036] 有効な支払者名で更新すると、200 を返す', async () => {
			const mockUpdated = {
				id: PAYER_ID,
				userId: 'user-1',
				name: '鈴木',
				createdAt: new Date('2026-03-01T00:00:00.000Z')
			};
			vi.mocked(service.updatePayer).mockResolvedValueOnce(mockUpdated);

			const response = await PUT({
				request: makePutRequest({ name: '鈴木' }),
				params: { id: PAYER_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('鈴木');
		});
	});

	describe('異常系（バリデーション）', () => {
		test('[SPEC: AC-116] 支払者名が空の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ name: '' }),
				params: { id: PAYER_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.message).toBe('入力値が正しくありません');
			expect(body.fields).toContainEqual({ field: 'name', message: '支払者名は必須です' });
		});

		test('[SPEC: AC-117] 支払者名が51文字以上の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ name: 'あ'.repeat(51) }),
				params: { id: PAYER_ID },
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

		test('[SPEC: AC-118] 存在しない支払者IDの場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.updatePayer).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await PUT({
				request: makePutRequest({ name: '新支払者' }),
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

describe('DELETE /expenses/payers/[id]', () => {
	describe('正常系', () => {
		test('[SPEC: AC-037] 支払者に紐付く支出が0件の場合、204 を返す', async () => {
			vi.mocked(service.deletePayer).mockResolvedValueOnce(undefined);

			const response = await DELETE({
				request: makeDeleteRequest(),
				params: { id: PAYER_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(204);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-118] 存在しない支払者IDの場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.deletePayer).mockRejectedValueOnce(
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

		test('[SPEC: AC-119] 支払者に紐付く支出が1件以上ある場合、409 CONFLICT を返す', async () => {
			vi.mocked(service.deletePayer).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, 'この支払者は使用中のため削除できません')
			);

			const response = await DELETE({
				request: makeDeleteRequest(),
				params: { id: PAYER_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof PUT>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('この支払者は使用中のため削除できません');
		});
	});
});
