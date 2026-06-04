/**
 * @file テスト: 筋トレ種目 詳細 API ハンドラ
 * @module src/routes/workout/exercises/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { PUT } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/exercises/service', () => ({
	updateExercise: vi.fn(),
	deleteExercise: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };
const mockParams = { id: 'exercise-id' };

describe('PUT /workout/exercises/[id]', () => {
	test('name が空文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/exercise-id', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const response = await PUT({
			request,
			params: mockParams,
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('name が51文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/exercise-id', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'a'.repeat(51) })
		});
		const response = await PUT({
			request,
			params: mockParams,
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は updateExercise が呼ばれない', async () => {
		const { updateExercise } = await import('$workout/exercises/service');
		vi.mocked(updateExercise).mockClear();
		const request = new Request('http://localhost/workout/exercises/exercise-id', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		await PUT({ request, params: mockParams, locals: mockLocals, platform: mockPlatform } as any);
		expect(updateExercise).not.toHaveBeenCalled();
	});
});
