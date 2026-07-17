/**
 * @file ヘルパー: Workers AI 呼び出し
 * @module src/lib/features/recipes/server/ai.ts
 * @feature recipes
 *
 * @description
 * レシピ機能で共通利用する Cloudflare Workers AI（llama-3.1）呼び出しヘルパー。
 * ask（AI 献立相談）・extract（AI レシピ抽出）の両エンドポイントで同一だった
 * `AiRunner` 型定義・`ai.run(...)` 呼び出しパターンを共通化する。
 *
 * @functions
 * - runRecipeAi - システムプロンプト・ユーザーメッセージを渡し AI 応答テキストを取得する
 */

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

type AiRunner = { run: (model: string, opts: unknown) => Promise<{ response?: string }> };

/**
 * Workers AI にシステムプロンプト・ユーザーメッセージを渡して応答テキストを取得する。
 * `ai.run()` の返り値型が実際の API と合わないため `as unknown as AiRunner` でキャストする（external-integrations.md 参照）。
 */
export async function runRecipeAi(
	ai: unknown,
	systemPrompt: string,
	userMessage: string
): Promise<string | undefined> {
	const runner = ai as unknown as AiRunner;
	const aiResponse = await runner.run(AI_MODEL, {
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage }
		]
	});
	return aiResponse.response;
}
