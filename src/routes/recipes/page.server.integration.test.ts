/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: レシピ一覧 load 関数
 * @module src/routes/recipes/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-001
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { createRecipe } from '$recipes/_lib/service';
import { load } from './+page.server';

type LoadResult = { items: { name: string }[]; total: number; page: number; limit: number };

function createLoadEvent(searchParams: Record<string, string> = {}) {
	const params = new URLSearchParams(searchParams);
	const url = new URL(`http://localhost/recipes?${params}`);
	return {
		url,
		platform: { env },
		locals: { user: { id: crypto.randomUUID() }, session: {} },
		params: {},
		request: new Request(url)
	} as Parameters<typeof load>[0];
}

describe('load (page.server)', () => {
	test('[SPEC: AC-001] sort が未指定の場合、createdAt_desc でレシピが返る // spec:740d22fd', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		await createRecipe(db, userId, { name: '最初のレシピ' });
		await createRecipe(db, userId, { name: '最後のレシピ' });

		const event = createLoadEvent();
		// user を上書き
		event.locals.user = { id: userId } as typeof event.locals.user;

		const result = (await load(event)) as LoadResult;

		expect(result.items).toHaveLength(2);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		// createdAt_desc: 最後に作ったものが先頭
		expect(result.items[0].name).toBe('最後のレシピ');
	});

	test('[SPEC: AC-001] 不正な sort 値を指定した場合、デフォルト値（createdAt_desc）にフォールバックして正常に返る // spec:740d22fd', async () => {
		const event = createLoadEvent({ sort: 'invalid_sort_value' });

		// フォールバックするため例外を投げずに結果が返ること
		const result = (await load(event)) as LoadResult;

		expect(result).toBeDefined();
		expect(result.page).toBe(1);
		expect(result.limit).toBe(20);
		expect(Array.isArray(result.items)).toBe(true);
	});

	test('[SPEC: AC-001] page=2&limit=2 でページネーションが機能する // spec:740d22fd', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		for (let i = 1; i <= 5; i++) {
			await createRecipe(db, userId, { name: `ページネーションレシピ${i}` });
		}

		const event = createLoadEvent({ page: '2', limit: '2' });
		event.locals.user = { id: userId } as typeof event.locals.user;

		const result = (await load(event)) as LoadResult;

		expect(result.page).toBe(2);
		expect(result.limit).toBe(2);
		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(5);
	});
});
