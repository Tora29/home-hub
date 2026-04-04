/**
 * @file テスト: AI レシピ抽出 API
 * @module src/routes/recipes/extract/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-011, AC-012, AC-114
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './+server';

// dev フラグをテストごとに切り替えられるようにする
let mockDev = true;
vi.mock('$app/environment', () => ({
	get dev() {
		return mockDev;
	}
}));

type AiMock = { run: (model: string, opts: unknown) => Promise<{ response?: string }> };

function createEvent(body: unknown, ai?: AiMock) {
	return {
		request: new Request('http://localhost/recipes/extract', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		}),
		locals: { user: { id: 'test-user-id' }, session: {} },
		platform: { env: ai ? { AI: ai } : {} }
	};
}

describe('POST /recipes/extract', () => {
	describe('dev モード（ダミーレスポンス）', () => {
		test('[SPEC: AC-011] テキストを送信すると 200 とダミーレシピデータが返る', async () => {
			const event = createEvent({
				text: '鶏のから揚げ\n材料：鶏もも肉 300g\n作り方：1. 下味をつける 2. 揚げる'
			});

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('ダミーレシピ（ローカル開発用）');
			expect(body.servings).toBe(2);
			expect(body.cookingTimeMinutes).toBe(30);
			expect(Array.isArray(body.ingredients)).toBe(true);
			expect(Array.isArray(body.steps)).toBe(true);
		});

		test('[SPEC: AC-012] ノイズを含むテキストでも 200 が返る', async () => {
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

		test('[SPEC: AC-114] text が空の場合は 400 VALIDATION_ERROR が返る', async () => {
			const event = createEvent({ text: '' });

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});

		test('[SPEC: AC-114] text が未指定の場合は 400 VALIDATION_ERROR が返る', async () => {
			const event = createEvent({});

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('production モード（Workers AI）', () => {
		beforeEach(() => {
			mockDev = false;
		});
		afterEach(() => {
			mockDev = true;
		});

		test('[SPEC: AC-011] Workers AI がクリーンな JSON を返した場合に正しく抽出される', async () => {
			const ai: AiMock = {
				run: async () => ({
					response: JSON.stringify({
						name: 'テストレシピ',
						description: '説明',
						servings: 2,
						cookingTimeMinutes: 30,
						ingredients: [{ name: '食材A', amount: '100g' }],
						steps: ['手順1', '手順2']
					})
				})
			};
			const event = createEvent({ text: 'some recipe text' }, ai);

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('テストレシピ');
			expect(body.servings).toBe(2);
			expect(body.ingredients).toEqual([{ name: '食材A', amount: '100g' }]);
		});

		test('[SPEC: AC-011] Workers AI が説明文付きで JSON を返した場合も正しく抽出される', async () => {
			const ai: AiMock = {
				run: async () => ({
					response:
						'以下がレシピ情報です。\n{"name": "カツ丼", "description": null, "servings": 4, "cookingTimeMinutes": 20, "ingredients": [{"name": "豚カツ", "amount": "1枚"}], "steps": ["カツを揚げる", "丼に盛る"]}'
				})
			};
			const event = createEvent({ text: 'some recipe text' }, ai);

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('カツ丼');
			expect(body.servings).toBe(4);
		});

		test('[SPEC: AC-011] Workers AI がコードブロック付きで JSON を返した場合も正しく抽出される', async () => {
			const ai: AiMock = {
				run: async () => ({
					response:
						'Here is the extracted recipe:\n```json\n{"name": "親子丼", "servings": 2, "cookingTimeMinutes": 15, "ingredients": null, "steps": null, "description": null}\n```'
				})
			};
			const event = createEvent({ text: 'some recipe text' }, ai);

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBe('親子丼');
		});

		test('[SPEC: AC-011] Workers AI が JSON を返せなかった場合は全フィールド null で 200 が返る', async () => {
			const ai: AiMock = {
				run: async () => ({
					response: 'Sorry, I could not extract the recipe information.'
				})
			};
			const event = createEvent({ text: 'some recipe text' }, ai);

			const response = await POST(event as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.name).toBeNull();
			expect(body.ingredients).toBeNull();
			expect(body.steps).toBeNull();
		});
	});
});
