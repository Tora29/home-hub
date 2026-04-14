/**
 * @file テスト: Category サービス
 * @module src/routes/expenses/categories/service.integration.test.ts
 * @testType integration
 *
 * @target ./service.ts
 * @spec specs/expenses/spec.md
 * @covers AC-011, AC-012, AC-013
 */

import { describe, test, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('getCategories', () => {
	test('[SPEC: AC-011] カテゴリ一覧を取得できる // spec:8fe156c1', async () => {
		const res = await SELF.fetch('http://localhost/expenses/categories');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			items: unknown[];
			total: number;
			page: number;
			limit: number;
		};
		expect(body).toHaveProperty('items');
		expect(Array.isArray(body.items)).toBe(true);
	});
});

describe('createCategory', () => {
	test('[SPEC: AC-011] 正しいカテゴリ名でカテゴリを登録できる // spec:8fe156c1', async () => {
		const res = await SELF.fetch('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'テストカテゴリ' })
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string; name: string };
		expect(body.name).toBe('テストカテゴリ');
		expect(typeof body.id).toBe('string');
	});

	test('[SPEC: AC-203] カテゴリ名が 50 文字の場合、登録できる // spec:8fe156c1', async () => {
		const name = 'あ'.repeat(50);
		const res = await SELF.fetch('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as { name: string };
		expect(body.name).toBe(name);
	});
});

describe('updateCategory', () => {
	test('[SPEC: AC-012] カテゴリ名を更新できる // spec:8fe156c1', async () => {
		// まずカテゴリを作成
		const createRes = await SELF.fetch('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '更新前カテゴリ' })
		});
		expect(createRes.status).toBe(201);
		const created = (await createRes.json()) as { id: string };

		const updateRes = await SELF.fetch(`http://localhost/expenses/categories/${created.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '更新後カテゴリ' })
		});
		expect(updateRes.status).toBe(200);
		const body = (await updateRes.json()) as { name: string };
		expect(body.name).toBe('更新後カテゴリ');
	});
});

describe('deleteCategory', () => {
	test('[SPEC: AC-013] 支出に紐付いていないカテゴリを削除できる // spec:8fe156c1', async () => {
		const createRes = await SELF.fetch('http://localhost/expenses/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: '削除用カテゴリ' })
		});
		expect(createRes.status).toBe(201);
		const created = (await createRes.json()) as { id: string };

		const deleteRes = await SELF.fetch(`http://localhost/expenses/categories/${created.id}`, {
			method: 'DELETE'
		});
		expect(deleteRes.status).toBe(204);
	});
});
