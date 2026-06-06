/**
 * @file テスト: 支出カテゴリ API ハンドラ
 * @module src/routes/expenses/categories/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$expenses/categories/server/service', () => ({
	createCategory: vi.fn(),
	getCategories: vi.fn()
}));

const mockPlatform = { env: { DB: {} } };

describe('POST /expenses/categories', () => {
	test('name が空文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('name が51文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'a'.repeat(51) })
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses/categories', {
			method: 'POST',
			body: 'not-json'
		});
		const response = await POST({ request, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createCategory が呼ばれない', async () => {
		const { createCategory } = await import('$expenses/categories/server/service');
		vi.mocked(createCategory).mockClear();
		const request = new Request('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		await POST({ request, platform: mockPlatform } as any);
		expect(createCategory).not.toHaveBeenCalled();
	});
});
