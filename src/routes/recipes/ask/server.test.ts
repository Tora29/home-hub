/**
 * @file テスト: AI 献立相談 API
 * @module src/routes/recipes/ask/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/recipes/spec.md
 * @covers AC-006, AC-111, AC-112
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

// service をモック（ユニットテストでは DB アクセスをスキップ）
vi.mock('../service', () => ({
	getAllRecipes: vi.fn().mockResolvedValue([
		{
			id: 'r1',
			name: 'からあげ',
			ingredients: [{ name: '鶏もも肉', amount: '300g' }],
			lastCookedAt: null,
			rating: 'excellent',
			difficulty: 'easy',
			cookedCount: 3
		}
	])
}));

function createEvent(body: unknown) {
	return {
		request: new Request('http://localhost/recipes/ask', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		}),
		locals: { user: { id: 'test-user-id' }, session: {} },
		platform: { env: {} }
	};
}

describe('POST /recipes/ask', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('[SPEC: AC-006] 有効な question を送信すると 200 と answer フィールドが返る', async () => {
		const event = createEvent({ question: '最近作ってないもので肉系が食べたいんだけど？' });

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('answer');
		expect(typeof body.answer).toBe('string');
		expect(body.answer.length).toBeGreaterThan(0);
	});

	test('[SPEC: AC-111] question が空の場合は 400 VALIDATION_ERROR が返る', async () => {
		const event = createEvent({ question: '' });

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-111] question が未指定の場合は 400 VALIDATION_ERROR が返る', async () => {
		const event = createEvent({});

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-112] question が 501 文字の場合は 400 VALIDATION_ERROR が返る', async () => {
		const event = createEvent({ question: 'a'.repeat(501) });

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-112] question が 500 文字の場合は 200 が返る', async () => {
		const event = createEvent({ question: 'a'.repeat(500) });

		const response = await POST(event as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
	});
});
