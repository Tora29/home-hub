/**
 * @file テスト: API 一括承認依頼
 * @module src/routes/expenses/request/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-008, AC-115, AC-120
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type * as ErrorsModule from '$lib/server/errors';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		get: vi.fn().mockResolvedValue({ role: 'main' })
	})
}));

vi.mock('../service', () => ({
	requestExpenses: vi.fn()
}));

vi.mock('$lib/server/errors', async (importOriginal) => {
	const actual = await importOriginal<typeof ErrorsModule>();
	return actual;
});

vi.mock('$lib/server/tables', () => ({
	user: {}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { POST } from './+server';
import * as service from '../service';
import { AppError } from '$lib/server/errors';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = {
	env: {
		DB: {},
		LINE_CHANNEL_ACCESS_TOKEN: undefined,
		LINE_USER_ID_PRIMARY: undefined,
		LINE_USER_ID_SPOUSE: undefined,
		LINE_MOCK: 'true'
	}
};

function makePostRequest(): Request {
	return new Request('http://localhost/expenses/request', { method: 'POST' });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/request', () => {
	describe('正常系', () => {
		test('[SPEC: AC-008] checked 支出が存在する場合、200 と更新件数を返す', async () => {
			vi.mocked(service.requestExpenses).mockResolvedValueOnce({ count: 3 });

			const response = await POST({
				request: makePostRequest(),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.count).toBe(3);
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-115] checked 支出が 0 件の場合、409 CONFLICT を返す // spec:102bbfbf', async () => {
			vi.mocked(service.requestExpenses).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確認済みの支出がありません')
			);

			const response = await POST({
				request: makePostRequest(),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('確認済みの支出がありません');
		});

		test('[SPEC: AC-120] LINE API 失敗時は 502 BAD_GATEWAY を返す // spec:102bbfbf', async () => {
			vi.mocked(service.requestExpenses).mockRejectedValueOnce(
				new AppError(
					'BAD_GATEWAY',
					502,
					'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
				)
			);

			const response = await POST({
				request: makePostRequest(),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(502);
			const body = await response.json();
			expect(body.code).toBe('BAD_GATEWAY');
			expect(body.message).toBe('LINE 通知の送信に失敗したため承認フローを完了できませんでした');
		});
	});
});
