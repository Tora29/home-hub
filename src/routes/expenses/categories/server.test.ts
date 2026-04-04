/**
 * @file テスト: API Expense カテゴリ
 * @module src/routes/expense/categories/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-107, AC-108, AC-010
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('./service', () => ({
	getCategories: vi.fn(),
	createCategory: vi.fn()
}));

import { GET, POST } from './+server';
import * as service from './service';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makePostRequest(body: unknown): Request {
	return new Request('http://localhost/expense/categories', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /expense/categories', () => {
	test('[SPEC: AC-010] カテゴリ一覧を取得できる', async () => {
		const mockResponse = {
			items: [
				{
					id: 'cat-1',
					userId: 'user-1',
					name: '食費',
					createdAt: new Date('2026-03-01T00:00:00.000Z')
				}
			],
			total: 1,
			page: 1,
			limit: 20
		};
		vi.mocked(service.getCategories).mockResolvedValueOnce(mockResponse);

		const response = await GET({
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body.items).toHaveLength(1);
		expect(body.items[0].name).toBe('食費');
	});
});

describe('POST /expense/categories', () => {
	describe('正常系', () => {
		test('[SPEC: AC-010] 有効なカテゴリ名で登録すると、201 を返す', async () => {
			const mockCreated = {
				id: 'cat-new',
				userId: 'user-1',
				name: '交通費',
				createdAt: new Date('2026-03-28T00:00:00.000Z')
			};
			vi.mocked(service.createCategory).mockResolvedValueOnce(mockCreated);

			const response = await POST({
				request: makePostRequest({ name: '交通費' }),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof GET>[0]);

			expect(response.status).toBe(201);
			const body = await response.json();
			expect(body.name).toBe('交通費');
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-107] カテゴリ名が空の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({ name: '' }),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof GET>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.message).toBe('入力値が正しくありません');
			expect(body.fields).toContainEqual({ field: 'name', message: 'カテゴリ名は必須です' });
		});

		test('[SPEC: AC-107] カテゴリ名が未指定の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({}),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof GET>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});

		test('[SPEC: AC-108] カテゴリ名が51文字以上の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await POST({
				request: makePostRequest({ name: 'あ'.repeat(51) }),
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof GET>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({
				field: 'name',
				message: '50文字以内で入力してください'
			});
		});
	});
});
