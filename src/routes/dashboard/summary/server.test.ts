/**
 * @file テスト: API Dashboard Summary
 * @module src/routes/dashboard/summary/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('./service', () => ({
	getDashboardSummary: vi.fn()
}));

import { GET } from './+server';
import * as service from './service';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makeUrl(params: Record<string, string> = {}): URL {
	const url = new URL('http://localhost/dashboard/summary');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /dashboard/summary', () => {
	test('認証ユーザーIDを getDashboardSummary に渡す', async () => {
		vi.mocked(service.getDashboardSummary).mockResolvedValueOnce({
			overall: 0,
			byPayer: [],
			byCategory: []
		});

		const response = await GET({
			url: makeUrl({ period: 'month', month: '2026-04' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		expect(service.getDashboardSummary).toHaveBeenCalledWith({}, 'user-1', {
			period: 'month',
			month: '2026-04'
		});
	});
});
