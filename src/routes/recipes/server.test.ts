/**
 * @file テスト: レシピ API ハンドラ
 * @module src/routes/recipes/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { GET, POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$recipes/service', () => ({
	createRecipe: vi.fn(),
	getRecipes: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('GET /recipes', () => {
	test('sort が無効値の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/recipes?sort=name_asc'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('page が0の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/recipes?page=0'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は getRecipes が呼ばれない', async () => {
		const { getRecipes } = await import('$recipes/service');
		vi.mocked(getRecipes).mockClear();
		await GET({
			url: new URL('http://localhost/recipes?sort=invalid'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(getRecipes).not.toHaveBeenCalled();
	});
});

describe('POST /recipes', () => {
	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/recipes', {
			method: 'POST',
			body: 'not-json'
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('name が空文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/recipes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('name が101文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/recipes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'a'.repeat(101) })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('rating が無効値の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/recipes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'テスト', rating: 'super' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createRecipe が呼ばれない', async () => {
		const { createRecipe } = await import('$recipes/service');
		vi.mocked(createRecipe).mockClear();
		const request = new Request('http://localhost/recipes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(createRecipe).not.toHaveBeenCalled();
	});
});
