/**
 * @file テスト: ダッシュボード集計 API ハンドラ
 * @module src/routes/dashboard/summary/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { GET } from './+server';

type GetEvent = Parameters<typeof GET>[0];

// バリデーション失敗時は service を呼ばずに 400 を返すため、DB・service のモックは不要
async function callGet(query: string) {
	const response = await GET({
		url: new URL(`http://localhost/dashboard/summary?${query}`),
		platform: { env: { DB: {} } }
	} as unknown as GetEvent);
	return {
		status: response.status,
		body: (await response.json()) as {
			code: string;
			fields: { field: string; message: string }[];
		}
	};
}

describe('GET /dashboard/summary', () => {
	test('period が month / all 以外の場合、VALIDATION_ERROR「期間は month または all を指定してください」が返る', async () => {
		const { status, body } = await callGet('period=week');
		expect(status).toBe(400);
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'period', message: '期間は month または all を指定してください' }
		]);
	});

	test('month の形式が YYYY-MM でない場合、VALIDATION_ERROR「月はYYYY-MM形式で入力してください」が返る', async () => {
		const { status, body } = await callGet('period=month&month=2024/06');
		expect(status).toBe(400);
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'month', message: '月はYYYY-MM形式で入力してください' }]);
	});

	test('month が 13 月の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', async () => {
		const { status, body } = await callGet('period=month&month=2024-13');
		expect(status).toBe(400);
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'month', message: '月は01〜12で入力してください' }]);
	});
});
