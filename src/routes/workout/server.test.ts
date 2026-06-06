/**
 * @file テスト: 筋トレ記録 API ハンドラ
 * @module src/routes/workout/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/server/service', () => ({
	createRecord: vi.fn(),
	getRecords: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('POST /workout', () => {
	test('exerciseId が空の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseId: '', date: '2024-01-15', weight: 80, reps: 5 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('重量が負の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseId: 'ex-1', date: '2024-01-15', weight: -1, reps: 5 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('回数が11の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseId: 'ex-1', date: '2024-01-15', weight: 80, reps: 11 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('日付フォーマットが不正な場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseId: 'ex-1', date: '2024/01/15', weight: 80, reps: 5 })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createRecord が呼ばれない', async () => {
		const { createRecord } = await import('$workout/server/service');
		vi.mocked(createRecord).mockClear();
		const request = new Request('http://localhost/workout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exerciseId: '', date: '2024-01-15', weight: 80, reps: 5 })
		});
		await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(createRecord).not.toHaveBeenCalled();
	});
});
