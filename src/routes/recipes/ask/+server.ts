/**
 * @file API: AI 献立相談
 * @module src/routes/recipes/ask/+server.ts
 * @feature recipes
 *
 * @description
 * ユーザーの全レシピをコンテキストとして Workers AI（llama-3.1）に渡し、
 * 自然言語の献立相談に回答する。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-006, AC-111, AC-112
 *
 * @endpoints
 * - POST /recipes/ask → 200 AskResponse - AI 献立相談
 *   @body askSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ../service.ts
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { askSchema } from '../schema';
import { getAllRecipes } from '../service';

/**
 * AI 献立相談。全レシピをコンテキストに含めて Workers AI に問い合わせる。
 * @ac AC-006, AC-111, AC-112
 * @body askSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const body = await request.json();
	const result = askSchema.safeParse(body);
	if (!result.success) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: result.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	try {
		const db = createDb(platform!.env.DB);
		const recipes = await getAllRecipes(db, locals.user!.id);

		const recipeContext = recipes
			.map((r) => {
				const ingredients =
					r.ingredients?.map((i) => `${i.name}${i.amount ? ` ${i.amount}` : ''}`).join('、') ??
					'なし';
				const lastCooked = r.lastCookedAt ? r.lastCookedAt.toLocaleDateString('ja-JP') : '未調理';
				return `- ${r.name}（難易度: ${r.difficulty ?? '不明'}）: 材料: ${ingredients}, 評価: ${r.rating ?? '未設定'}, 作った回数: ${r.cookedCount}回, 最終調理日: ${lastCooked}`;
			})
			.join('\n');

		const systemPrompt = `あなたは料理の献立相談アシスタントです。ユーザーの登録済みレシピを参考に、献立に関する質問に日本語で答えてください。

登録済みレシピ一覧:
${recipeContext || 'レシピが登録されていません。'}`;

		let answer: string;
		if (dev) {
			answer = `【ローカル開発用ダミー回答】\n「${result.data.question}」についての回答です。本番環境では Workers AI が実際の回答を生成します。`;
		} else {
			type AiRunner = { run: (model: string, opts: unknown) => Promise<{ response?: string }> };
			const ai = platform!.env.AI as unknown as AiRunner;
			const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: result.data.question }
				]
			});
			answer = aiResponse.response ?? 'AI からの回答を取得できませんでした。';
		}

		return json({ answer });
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};
