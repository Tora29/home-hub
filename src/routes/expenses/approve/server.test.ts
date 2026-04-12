/**
 * @file テスト: API Expense 一括承認
 * @module src/routes/expenses/approve/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('../service', () => ({
	approveExpenses: vi.fn(),
	getPartnerUserId: vi.fn()
}));

vi.mock('$lib/server/line', () => ({
	sendLineMessage: vi.fn(),
	getLineUserId: vi.fn(),
	getOppositeRole: vi.fn()
}));

import { POST } from './+server';
import * as service from '../service';

const mockPlatform = { env: { DB: {} } };

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/approve', () => {
	test('role=null かつ partner 未解決の場合、409 CONFLICT を返す', async () => {
		vi.mocked(service.getPartnerUserId).mockResolvedValueOnce(null);

		const response = await POST({
			locals: {
				user: { id: 'user-3', name: 'No Role User', role: null }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(service.approveExpenses).not.toHaveBeenCalled();
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: 'CONFLICT',
			message: '承認できる支出がありません'
		});
	});
});
