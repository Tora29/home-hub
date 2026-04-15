/// <reference types="@cloudflare/vitest-pool-workers/types" />
/**
 * @file テスト: レシピ詳細 load 関数
 * @module src/routes/recipes/[id]/page.server.integration.test.ts
 * @testType integration
 *
 * @target ./+page.server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-003
 */

import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createDb } from '$lib/server/db';
import { createRecipe } from '$recipes/_lib/service';
import { load } from './+page.server';

type LoadResult = { recipe: { id: string; name: string; description: string | null } };

function createLoadEvent(id: string, userId: string) {
	const url = new URL(`http://localhost/recipes/${id}`);
	return {
		url,
		platform: { env },
		locals: { user: { id: userId }, session: {} },
		params: { id },
		request: new Request(url)
	} as Parameters<typeof load>[0];
}

describe('load (recipes/[id]/page.server)', () => {
	test('[SPEC: AC-003] 存在するレシピ ID を指定するとレシピデータが返る // spec:13728276', async () => {
		const db = createDb(env.DB);
		const userId = crypto.randomUUID();

		const created = await createRecipe(db, userId, {
			name: '詳細取得テストレシピ',
			description: 'テスト説明',
			ingredients: [{ name: '材料A', amount: '100g' }],
			steps: ['手順1']
		});

		const event = createLoadEvent(created.id, userId);
		const result = (await load(event)) as LoadResult;

		expect(result.recipe).toBeDefined();
		expect(result.recipe.id).toBe(created.id);
		expect(result.recipe.name).toBe('詳細取得テストレシピ');
		expect(result.recipe.description).toBe('テスト説明');
	});

	test('[SPEC: AC-003] 存在しない ID を指定した場合は SvelteKit error(404) が投げられる // spec:13728276', async () => {
		const userId = crypto.randomUUID();
		const nonExistentId = crypto.randomUUID();

		const event = createLoadEvent(nonExistentId, userId);

		// SvelteKit の error() は HttpError (status + body) を throw する
		await expect(load(event)).rejects.toMatchObject({ status: 404 });
	});

	test('[SPEC: AC-003] 他ユーザーのレシピ ID を指定した場合は SvelteKit error(404) が投げられる // spec:13728276', async () => {
		const db = createDb(env.DB);
		const ownerId = crypto.randomUUID();
		const otherId = crypto.randomUUID();

		const created = await createRecipe(db, ownerId, { name: '他人のレシピ' });

		// 他ユーザーとして load を呼び出す
		const event = createLoadEvent(created.id, otherId);

		await expect(load(event)).rejects.toMatchObject({ status: 404 });
	});
});
