/**
 * @file サービス: 支出 LINE 通知
 * @module src/lib/features/expenses/server/line.ts
 * @feature expenses
 *
 * @description
 * 支出承認ワークフローで相手ユーザーへ送る LINE push 通知を担う。
 * D1 がトランザクション非対応のため通知はベストエフォート（失敗しても throw しない）。
 *
 * @functions
 * - buildLineEnv            - platform.env から LineEnv を組み立て
 * - notifyPartnerBestEffort - role から相手の LINE User ID を解決し、ベストエフォートで送信
 *
 * @test ./line.test.ts
 */

export type LineEnv = {
	lineChannelAccessToken?: string;
	lineUserIdPrimary?: string;
	lineUserIdSpouse?: string;
	lineMock?: string;
};

/**
 * レスポンス返却後にバックグラウンド実行させるための関数（Workers の `platform.context.waitUntil`）。
 * 未指定の場合は完了まで await する。
 */
export type Defer = (task: Promise<unknown>) => void;

/** Cloudflare の platform.env から LineEnv を組み立てる。 */
export function buildLineEnv(env: {
	LINE_CHANNEL_ACCESS_TOKEN?: string;
	LINE_USER_ID_PRIMARY?: string;
	LINE_USER_ID_SPOUSE?: string;
	LINE_MOCK?: string;
}): LineEnv {
	return {
		lineChannelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
		lineUserIdPrimary: env.LINE_USER_ID_PRIMARY,
		lineUserIdSpouse: env.LINE_USER_ID_SPOUSE,
		lineMock: env.LINE_MOCK
	};
}

async function sendLineMessage(
	lineUserId: string,
	messages: object[],
	lineChannelAccessToken: string
): Promise<void> {
	const res = await fetch('https://api.line.me/v2/bot/message/push', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${lineChannelAccessToken}`
		},
		body: JSON.stringify({ to: lineUserId, messages })
	});
	if (!res.ok) {
		throw new Error(`LINE API error: ${res.status}`);
	}
}

function resolvePartnerLineUserId(role: string | null, lineEnv: LineEnv): string | undefined {
	if (role === 'main') return lineEnv.lineUserIdSpouse;
	if (role === 'partner') return lineEnv.lineUserIdPrimary;
	return undefined; // role=null → 通知スキップ
}

/**
 * 相手ユーザーに LINE 通知をベストエフォートで送信する。
 * 通知先未解決・トークン未設定・LINE_MOCK=true の場合は送信しない。失敗しても throw せずログのみ。
 */
export async function notifyPartnerBestEffort(
	lineEnv: LineEnv,
	role: string | null,
	message: string
): Promise<void> {
	const partnerLineUserId = resolvePartnerLineUserId(role, lineEnv);
	const token = lineEnv.lineChannelAccessToken;
	if (!partnerLineUserId || !token || lineEnv.lineMock === 'true') return;

	try {
		await sendLineMessage(partnerLineUserId, [{ type: 'text', text: message }], token);
	} catch (e) {
		console.error('[LINE] 通知の送信に失敗しました:', e);
	}
}
