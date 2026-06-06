/**
 * @file テスト: 筋トレ種目 API ハンドラ
 * @module src/routes/workout/exercises/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/exercises/server/service', () => ({
	createExercise: vi.fn(),
	getExercises: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('POST /workout/exercises', () => {
	test('name が空文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('name が51文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'a'.repeat(51) })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises', {
			method: 'POST',
			body: 'not-json'
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createExercise が呼ばれない', async () => {
		const { createExercise } = await import('$workout/exercises/server/service');
		vi.mocked(createExercise).mockClear();
		const request = new Request('http://localhost/workout/exercises', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(createExercise).not.toHaveBeenCalled();
	});
});
