/**
 * @file テスト: Category API ハンドラ
 * @module src/routes/expenses/categories/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-107, AC-108
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('./service', () => ({
	createCategory: vi.fn(),
	getCategories: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn()
}));

async function callPostHandler(body: unknown) {
	vi.resetModules();
	vi.mock('./service', () => ({ createCategory: vi.fn() }));
	vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	const { POST } = await import('./+server');
	const request = new Request('http://localhost/expenses/categories', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const locals = { user: { id: 'user-1' } };
	const platform = { env: { DB: {} } };
	// @ts-expect-error - simplified event
	return POST({ request, locals, platform });
}

describe('POST /expenses/categories', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	test('[SPEC: AC-107] カテゴリ名が空の場合は 400 VALIDATION_ERROR を返す // spec:58569033', async () => {
		const res = await callPostHandler({ name: '' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'name' })])
		);
	});

	test('[SPEC: AC-107] カテゴリ名が未指定の場合は 400 VALIDATION_ERROR を返す // spec:58569033', async () => {
		const res = await callPostHandler({});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-108] カテゴリ名が 51 文字以上の場合は 400 VALIDATION_ERROR を返す // spec:58569033', async () => {
		const res = await callPostHandler({ name: 'a'.repeat(51) });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'name' })])
		);
	});
});
