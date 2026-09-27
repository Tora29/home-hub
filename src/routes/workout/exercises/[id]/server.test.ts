/**
 * @file テスト: 筋トレ種目 詳細 API ハンドラ
 * @module src/routes/workout/exercises/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { PUT } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };
const mockParams = { id: 'exercise-id' };

async function put(body: unknown): Promise<Response> {
	const request = new Request('http://localhost/workout/exercises/exercise-id', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return PUT({ request, params: mockParams, locals: mockLocals, platform: mockPlatform } as any);
}

describe('PUT /workout/exercises/[id]', () => {
	test('name が空文字の場合、400 VALIDATION_ERROR「種目名は必須です」が返る', async () => {
		const response = await put({ name: '', categoryId: null });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: '種目名は必須です' }]);
	});

	test('name が51文字の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る', async () => {
		const response = await put({ name: 'a'.repeat(51), categoryId: null });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: '50文字以内で入力してください' }]);
	});

	test('categoryId が省略された場合、400 VALIDATION_ERROR が返る（PUT は完全置換）', async () => {
		const response = await put({ name: 'スクワット' });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'categoryId', message: 'カテゴリの指定は必須です（未設定は null）' }
		]);
	});
});
