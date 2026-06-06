/**
 * @file テスト: 体重記録 API ハンドラ
 * @module src/routes/workout/(actions)/body-weight/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/server/service', () => ({
	upsertBodyWeight: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('POST /workout/body-weight', () => {
	test('体重が0の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/body-weight', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: '2024-01-15', weight: 0 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('体重が300より大きい場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/body-weight', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: '2024-01-15', weight: 300.1 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('日付フォーマットが不正な場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/body-weight', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: '2024/01/15', weight: 72.5 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は upsertBodyWeight が呼ばれない', async () => {
		const { upsertBodyWeight } = await import('$workout/server/service');
		vi.mocked(upsertBodyWeight).mockClear();
		const request = new Request('http://localhost/workout/body-weight', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: '2024-01-15', weight: 0 })
		});
		await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(upsertBodyWeight).not.toHaveBeenCalled();
	});
});
