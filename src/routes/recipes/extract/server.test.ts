/**
 * @file テスト: AI レシピ抽出 API
 * @module src/routes/recipes/extract/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-011, AC-012, AC-114
 */

import { describe, it, expect } from 'vitest';
import { POST } from './+server';

function createEvent(body: unknown) {
	return {
		request: new Request('http://localhost/recipes/extract', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		}),
		locals: { user: { id: 'test-user-id' }, session: {} },
		platform: { env: {} }
	};
}

describe('POST /recipes/extract', () => {
	it('[SPEC: AC-011] テキストを送信すると 200 と構造化レシピデータが返る', async () => {
		const event = createEvent({
			text: '鶏のから揚げ\n材料：鶏もも肉 300g、醤油 大さじ2\n作り方：1. 下味をつける 2. 揚げる'
		});

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		// ExtractResponse の構造を検証（抽出できなかったフィールドは null）
		expect(body).toHaveProperty('name');
		expect(body).toHaveProperty('ingredients');
		expect(body).toHaveProperty('steps');
		expect(body).toHaveProperty('servings');
		expect(body).toHaveProperty('cookingTimeMinutes');
	});

	it('[SPEC: AC-012] ナビゲーション・広告等のノイズを含むテキストでも 200 が返る', async () => {
		const event = createEvent({
			text: [
				'ホーム | レシピ一覧 | お気に入り',
				'広告：今すぐクリック！',
				'鶏のから揚げレシピ',
				'材料：鶏もも肉 300g',
				'作り方：揚げる',
				'フッター | プライバシーポリシー | 利用規約'
			].join('\n')
		});

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('name');
	});

	it('[SPEC: AC-114] text が空の場合は 400 VALIDATION_ERROR が返る', async () => {
		const event = createEvent({ text: '' });

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	it('[SPEC: AC-114] text が未指定の場合は 400 VALIDATION_ERROR が返る', async () => {
		const event = createEvent({});

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});
});
