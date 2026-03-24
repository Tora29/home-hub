/**
 * @file API: AI レシピ抽出
 * @module src/routes/recipes/extract/+server.ts
 * @feature recipes
 *
 * @description
 * レシピサイトからコピーした生テキスト（ノイズ込み）を Workers AI（llama-3.1）に渡し、
 * 構造化されたレシピデータを抽出して返す。抽出できなかったフィールドは null。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-011, AC-012, AC-114
 *
 * @endpoints
 * - POST /recipes/extract → 200 ExtractResponse - AI レシピ抽出
 *   @body extractSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @schema ../schema.ts
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AppError } from '$lib/server/errors';
import { extractSchema } from '../schema';

/**
 * テキストからレシピ情報を AI で抽出する。
 * @ac AC-011, AC-012, AC-114
 * @body extractSchema
 * @throws VALIDATION_ERROR - 入力値が不正な場合
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const body = await request.json();
	const result = extractSchema.safeParse(body);
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
		const systemPrompt = `You are a recipe extraction assistant. Extract recipe information from the provided text and return ONLY a valid JSON object with no explanation or markdown.

The JSON must follow this exact structure:
{
  "name": "recipe name or null",
  "description": "brief description or null",
  "servings": number or null,
  "cookingTimeMinutes": number or null,
  "ingredients": [{"name": "ingredient name", "amount": "amount and unit"}] or null,
  "steps": ["step 1", "step 2", ...] or null
}

Return null for any field you cannot extract. Extract only recipe-related content, ignoring advertisements and navigation text.`;

		// @ts-expect-error: llama-3.1-8b-instruct-fp8 is a valid CF Workers AI model not yet in type definitions
		const aiResponse = await platform!.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: result.data.text }
			]
		});

		const rawText = (aiResponse as { response?: string }).response ?? '{}';
		const cleaned = rawText
			.replace(/```json\n?/g, '')
			.replace(/```\n?/g, '')
			.trim();

		let extracted: Record<string, unknown>;
		try {
			extracted = JSON.parse(cleaned);
		} catch {
			extracted = {};
		}

		return json({
			name: extracted.name ?? null,
			description: extracted.description ?? null,
			servings: extracted.servings ?? null,
			cookingTimeMinutes: extracted.cookingTimeMinutes ?? null,
			ingredients: extracted.ingredients ?? null,
			steps: extracted.steps ?? null
		});
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
