/**
 * @file テスト: API 一括申請取り消し
 * @module src/routes/expenses/(actions)/cancel/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-009, AC-116
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type * as ErrorsModule from '$lib/server/errors';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('$expenses/_lib/service', () => ({
	cancelExpenses: vi.fn()
}));

vi.mock('$lib/server/errors', async (importOriginal) => {
	const actual = await importOriginal<typeof ErrorsModule>();
	return actual;
});

import { POST } from './+server';
import * as service from '$expenses/_lib/service';
import { AppError } from '$lib/server/errors';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makePostRequest(): Request {
	return new Request('http://localhost/expenses/cancel', { method: 'POST' });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/cancel', () => {
	describe('正常系', () => {
		test('[SPEC: AC-009] pending 支出が存在する場合、200 と更新件数を返す', async () => {
			vi.mocked(service.cancelExpenses).mockResolvedValueOnce({ count: 2 });

			const response = await POST({
				request: makePostRequest(),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.count).toBe(2);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-116] pending 支出が 0 件の場合、409 CONFLICT を返す // spec:102bbfbf', async () => {
			vi.mocked(service.cancelExpenses).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '申請中の支出がありません')
			);

			const response = await POST({
				request: makePostRequest(),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('申請中の支出がありません');
		});
	});
});
