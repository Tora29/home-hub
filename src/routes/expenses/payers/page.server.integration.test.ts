/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: データ取得 expenses/payers
 * @module src/routes/expenses/payers/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-035
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { createPayer, getPayers } from './service';

function makeUserId() {
	return crypto.randomUUID();
}

describe('load (payers +page.server.ts)', () => {
	test('[SPEC: AC-035] 支払者一覧を取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		await createPayer(db, userId, { name: '田中' });
		await createPayer(db, userId, { name: '佐藤' });

		const result = await getPayers(db, userId);

		expect(result.items).toHaveLength(2);
		expect(result.items.map((p) => p.name)).toEqual(expect.arrayContaining(['田中', '佐藤']));
	});

	test('[SPEC: AC-035] 支払者が0件のとき空配列を返す', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();

		const result = await getPayers(db, userId);

		expect(result.items).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	test('[SPEC: AC-035] 自分の支払者のみ取得できる', async () => {
		const db = createDb(env.DB);
		const userId = makeUserId();
		const otherUserId = makeUserId();

		await createPayer(db, userId, { name: '自分の支払者' });
		await createPayer(db, otherUserId, { name: '他人の支払者' });

		const result = await getPayers(db, userId);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe('自分の支払者');
	});
});
