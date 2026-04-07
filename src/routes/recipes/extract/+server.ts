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
import { dev } from '$app/environment';
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
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です', fields: [] },
			{ status: 400 }
		);
	}
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
  "ingredients": [{"name": "ingredient name", "amount": "amount and unit or empty string"}],
  "steps": ["step 1", "step 2", ...] or null
}

Rules:
- "name": Extract the recipe title if present. If not explicitly stated, infer it from the ingredients and steps (e.g. "ほうれん草の白和え"). Do NOT return null for name — always make your best guess.
- "servings": Look for patterns like "【2人前】" "2人分" "serves 2" and extract the number only.
- "ingredients": Ingredients may be listed with the name on one line and the amount on the next line. Pair them correctly. Ignore section headers like "☆調味料". If no amount is given, use empty string.
- "steps": Extract numbered cooking steps only. Ignore tips, notes, video labels, and advertisements.
- Return null only for fields you truly cannot determine.`;

		let rawText: string;
		if (dev && !platform?.env?.USE_REAL_AI) {
			rawText = JSON.stringify({
				name: 'ダミーレシピ（ローカル開発用）',
				description: '本番環境では Workers AI が実際のテキストから抽出します。',
				servings: 2,
				cookingTimeMinutes: 30,
				ingredients: [{ name: 'ダミー食材', amount: '適量' }],
				steps: ['手順1（ダミー）', '手順2（ダミー）']
			});
		} else {
			if (!platform?.env?.AI) {
				return json(
					{
						code: 'INTERNAL_SERVER_ERROR',
						message: 'AI 機能が利用できません。管理者にお問い合わせください。'
					},
					{ status: 500 }
				);
			}
			type AiRunner = { run: (model: string, opts: unknown) => Promise<{ response?: string }> };
			const ai = platform.env.AI as unknown as AiRunner;
			const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: result.data.text }
				]
			});
			console.log('[recipes/extract] AI raw response:', aiResponse.response?.slice(0, 200));
			rawText = aiResponse.response ?? '{}';
		}
		// LLM が JSON の前後に説明文を付加するケースに対応するため、
		// コードブロックを除去した後、正規表現で JSON オブジェクト部分を抽出する
		const stripped = rawText
			.replace(/```json\n?/g, '')
			.replace(/```\n?/g, '')
			.trim();

		let extracted: Record<string, unknown>;
		try {
			const jsonMatch = stripped.match(/\{[\s\S]*\}/);
			extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
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
