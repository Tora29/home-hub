/**
 * @file テスト: API Expense 支払者
 * @module src/routes/expenses/payers/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-116, AC-117
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('./service', () => ({
	getPayers: vi.fn(),
	createPayer: vi.fn()
}));

import { POST } from './+server';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makePostRequest(body: unknown): Request {
	return new Request('http://localhost/expenses/payers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/payers', () => {
	describe('異常系', () => {
		test('[SPEC: AC-116] 支払者名が空の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({ name: '' }),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.message).toBe('入力値が正しくありません');
			expect(body.fields).toContainEqual({ field: 'name', message: '支払者名は必須です' });
		});

		test('[SPEC: AC-116] 支払者名が未指定の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({}),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});

		test('[SPEC: AC-117] 支払者名が51文字以上の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({ name: 'あ'.repeat(51) }),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({
				field: 'name',
				message: '50文字以内で入力してください'
			});
		});
	});
});
