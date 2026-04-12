/**
 * @file テスト: LINE Messaging API ヘルパー
 * @module src/lib/server/line.test.ts
 * @testType unit
 *
 * @target ./line.ts
 * @spec specs/expenses/spec.md
 * @covers AC-120
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AppError } from './errors';
import { sendLineMessage, getLineUserId, getOppositeRole } from './line';

const mockEnv = {
	LINE_CHANNEL_ACCESS_TOKEN: 'test-token',
	LINE_USER_ID_PRIMARY: 'U_primary',
	LINE_USER_ID_SPOUSE: 'U_spouse'
};

describe('sendLineMessage', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('[SPEC: AC-120] 正常送信時はエラーを投げない', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

		await expect(
			sendLineMessage(mockEnv, 'U_primary', 'テストメッセージ')
		).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledOnce();
	});

	test('[SPEC: AC-120] LINE API が 4xx/5xx を返した場合、BAD_GATEWAY を投げる', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response('{"message":"Invalid reply token"}', { status: 400 })
		);

		await expect(sendLineMessage(mockEnv, 'U_primary', 'テスト')).rejects.toSatisfy(
			(e: unknown) =>
				e instanceof AppError &&
				e.code === 'BAD_GATEWAY' &&
				e.status === 502 &&
				e.message === 'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		);
	});

	test('[SPEC: AC-120] ネットワークエラー（タイムアウト等）の場合、BAD_GATEWAY を投げる', async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

		await expect(sendLineMessage(mockEnv, 'U_primary', 'テスト')).rejects.toSatisfy(
			(e: unknown) =>
				e instanceof AppError &&
				e.code === 'BAD_GATEWAY' &&
				e.status === 502 &&
				e.message === 'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		);
	});

	test('[SPEC: AC-120] DNS 失敗（ENOTFOUND）の場合、BAD_GATEWAY を投げる', async () => {
		const dnsError = Object.assign(new Error('getaddrinfo ENOTFOUND api.line.me'), {
			code: 'ENOTFOUND'
		});
		vi.mocked(fetch).mockRejectedValueOnce(dnsError);

		await expect(sendLineMessage(mockEnv, 'U_primary', 'テスト')).rejects.toSatisfy(
			(e: unknown) => e instanceof AppError && e.code === 'BAD_GATEWAY'
		);
	});

	test('LINE_CHANNEL_ACCESS_TOKEN 未設定の場合、fetch を呼ばずスキップする', async () => {
		const envNoToken = { ...mockEnv, LINE_CHANNEL_ACCESS_TOKEN: undefined };

		await expect(sendLineMessage(envNoToken, 'U_primary', 'テスト')).resolves.toBeUndefined();
		expect(fetch).not.toHaveBeenCalled();
	});

	test('LINE_MOCK=true の場合、fetch を呼ばずスキップする', async () => {
		const mockModeEnv = { ...mockEnv, LINE_MOCK: 'true' };

		await expect(sendLineMessage(mockModeEnv, 'U_primary', 'テスト')).resolves.toBeUndefined();
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe('getLineUserId', () => {
	test('role=primary のとき LINE_USER_ID_PRIMARY を返す', () => {
		expect(getLineUserId(mockEnv, 'primary')).toBe('U_primary');
	});

	test('role=spouse のとき LINE_USER_ID_SPOUSE を返す', () => {
		expect(getLineUserId(mockEnv, 'spouse')).toBe('U_spouse');
	});

	test('role=null のとき undefined を返す', () => {
		expect(getLineUserId(mockEnv, null)).toBeUndefined();
	});
});

describe('getOppositeRole', () => {
	test('primary → spouse を返す', () => {
		expect(getOppositeRole('primary')).toBe('spouse');
	});

	test('spouse → primary を返す', () => {
		expect(getOppositeRole('spouse')).toBe('primary');
	});

	test('null → null を返す', () => {
		expect(getOppositeRole(null)).toBeNull();
	});
});
