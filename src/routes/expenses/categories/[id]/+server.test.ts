/**
 * @file テスト: Category [id] API ハンドラ
 * @module src/routes/expenses/categories/[id]/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-109, AC-110
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '$lib/server/errors';

function makeLocals(userId = 'user-1') {
	return { user: { id: userId } };
}

function makePlatform() {
	return { env: { DB: {} } };
}

describe('PUT /expenses/categories/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ updateCategory: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-109] 存在しないカテゴリ ID に対して PUT した場合は 404 NOT_FOUND を返す // spec:5f2343f4', async () => {
		const { updateCategory } = await import('../service');
		vi.mocked(updateCategory).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/categories/non-existent', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '更新名' })
		});
		const params = { id: 'non-existent' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals(), platform: makePlatform() });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(body.message).toBe('該当データが見つかりません');
	});

	test('[SPEC: AC-107] カテゴリ名が空の場合は 400 VALIDATION_ERROR を返す // spec:58569033', async () => {
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/categories/cat-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '' })
		});
		const params = { id: 'cat-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals(), platform: makePlatform() });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-108] カテゴリ名が 51 文字以上の場合は 400 VALIDATION_ERROR を返す // spec:58569033', async () => {
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/categories/cat-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'a'.repeat(51) })
		});
		const params = { id: 'cat-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals(), platform: makePlatform() });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});
});

describe('DELETE /expenses/categories/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ deleteCategory: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-109] 存在しないカテゴリ ID に対して DELETE した場合は 404 NOT_FOUND を返す // spec:5f2343f4', async () => {
		const { deleteCategory } = await import('../service');
		vi.mocked(deleteCategory).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);
		const { DELETE } = await import('./+server');
		const request = new Request('http://localhost/expenses/categories/non-existent', {
			method: 'DELETE'
		});
		const params = { id: 'non-existent' };
		// @ts-expect-error - simplified event
		const res = await DELETE({ request, params, locals: makeLocals(), platform: makePlatform() });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	test('[SPEC: AC-110] 支出に紐付いているカテゴリを削除しようとすると 409 CONFLICT を返す // spec:224f4ce6', async () => {
		const { deleteCategory } = await import('../service');
		vi.mocked(deleteCategory).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, 'このカテゴリは使用中のため削除できません')
		);
		const { DELETE } = await import('./+server');
		const request = new Request('http://localhost/expenses/categories/cat-1', {
			method: 'DELETE'
		});
		const params = { id: 'cat-1' };
		// @ts-expect-error - simplified event
		const res = await DELETE({ request, params, locals: makeLocals(), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('このカテゴリは使用中のため削除できません');
	});
});
