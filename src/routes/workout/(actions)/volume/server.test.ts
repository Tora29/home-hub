/**
 * @file テスト: 週間ボリューム API ハンドラ
 * @module src/routes/workout/(actions)/volume/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/server/service', () => ({
	getWeeklyVolume: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('GET /workout/volume', () => {
	test('period が不正な値の場合、400 VALIDATION_ERROR が返る', async () => {
		const url = new URL('http://localhost/workout/volume?period=invalid');
		const response = await GET({ url, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は getWeeklyVolume が呼ばれない', async () => {
		const { getWeeklyVolume } = await import('$workout/server/service');
		vi.mocked(getWeeklyVolume).mockClear();
		const url = new URL('http://localhost/workout/volume?period=invalid');
		await GET({ url, locals: mockLocals, platform: mockPlatform } as any);
		expect(getWeeklyVolume).not.toHaveBeenCalled();
	});
});
