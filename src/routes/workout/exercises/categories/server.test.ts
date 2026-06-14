/**
 * @file テスト: 筋トレ種目カテゴリ API ハンドラ
 * @module src/routes/workout/exercises/categories/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/exercises/server/service', () => ({
	createExerciseCategory: vi.fn(),
	getExerciseCategories: vi.fn()
}));

const mockPlatform = { env: { DB: {} } };

describe('POST /workout/exercises/categories', () => {
	test('カテゴリ名が空の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('カテゴリ名が31文字以上の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'あ'.repeat(31) })
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/categories', {
			method: 'POST',
			body: 'not-json'
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createExerciseCategory が呼ばれない', async () => {
		const { createExerciseCategory } = await import('$workout/exercises/server/service');
		vi.mocked(createExerciseCategory).mockClear();
		const request = new Request('http://localhost/workout/exercises/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		await POST({ request, platform: mockPlatform } as any);
		expect(createExerciseCategory).not.toHaveBeenCalled();
	});
});
