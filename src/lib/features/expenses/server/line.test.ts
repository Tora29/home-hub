/**
 * @file テスト: 支出 LINE 通知
 * @module src/lib/features/expenses/server/line.test.ts
 * @testType unit
 *
 * @target ./line.ts
 */
import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildLineEnv, notifyPartnerBestEffort, type LineEnv } from './line';

const lineEnv: LineEnv = {
	lineChannelAccessToken: 'token',
	lineUserIdPrimary: 'line-primary',
	lineUserIdSpouse: 'line-spouse'
};

function stubFetch(ok = true) {
	const fetchMock = vi.fn(async () => new Response('{}', { status: ok ? 200 : 500 }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function sentTo(fetchMock: ReturnType<typeof stubFetch>): string {
	const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
	return (JSON.parse(init.body as string) as { to: string }).to;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('buildLineEnv', () => {
	test('platform.env の LINE 設定から通知設定を組み立てできる', () => {
		expect(
			buildLineEnv({
				LINE_CHANNEL_ACCESS_TOKEN: 'token',
				LINE_USER_ID_PRIMARY: 'line-primary',
				LINE_USER_ID_SPOUSE: 'line-spouse',
				LINE_MOCK: 'true'
			})
		).toEqual({
			lineChannelAccessToken: 'token',
			lineUserIdPrimary: 'line-primary',
			lineUserIdSpouse: 'line-spouse',
			lineMock: 'true'
		});
	});
});

describe('notifyPartnerBestEffort', () => {
	test('main ユーザーの操作で partner（配偶者）の LINE に通知できる', async () => {
		const fetchMock = stubFetch();
		await notifyPartnerBestEffort(lineEnv, 'main', '本文');
		expect(sentTo(fetchMock)).toBe('line-spouse');
	});

	test('partner ユーザーの操作で main の LINE に通知できる', async () => {
		const fetchMock = stubFetch();
		await notifyPartnerBestEffort(lineEnv, 'partner', '本文');
		expect(sentTo(fetchMock)).toBe('line-primary');
	});

	test('role 未設定の場合、通知を送信しない', async () => {
		const fetchMock = stubFetch();
		await notifyPartnerBestEffort(lineEnv, null, '本文');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('LINE_MOCK=true の場合、通知を送信しない', async () => {
		const fetchMock = stubFetch();
		await notifyPartnerBestEffort({ ...lineEnv, lineMock: 'true' }, 'main', '本文');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('LINE API が失敗した場合、エラーを投げずに処理を継続できる', async () => {
		stubFetch(false);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(notifyPartnerBestEffort(lineEnv, 'main', '本文')).resolves.toBeUndefined();
		expect(consoleError).toHaveBeenCalled();
	});
});
