/**
 * @file ヘルパー: LINE Messaging API
 * @module src/lib/server/line.ts
 *
 * @description
 * LINE Messaging API を使ったプッシュ通知送信ユーティリティ。
 * 承認依頼・承認完了の通知に使用する。
 *
 * LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は開発利便性のためスキップ（ログ出力のみ）。
 * LINE API が 4xx/5xx を返した場合は AppError（BAD_GATEWAY/502）を投げる。
 */
import { AppError } from './errors';

type Env = {
	LINE_CHANNEL_ACCESS_TOKEN?: string;
	LINE_USER_ID_PRIMARY?: string;
	LINE_USER_ID_SPOUSE?: string;
	LINE_MOCK?: string;
};

/**
 * LINE プッシュ通知を送信する。
 * LINE_MOCK=true の場合はモックとしてスキップ（開発・E2E 環境用）。
 * @throws {BAD_GATEWAY} - LINE API が 4xx/5xx を返した場合、またはネットワークエラー（タイムアウト・DNS/TLS 失敗など）が発生した場合
 */
export async function sendLineMessage(env: Env, toUserId: string, message: string): Promise<void> {
	if (env.LINE_MOCK === 'true') {
		console.log(`[LINE] MOCK: 宛先: ${toUserId}、メッセージ: ${message}`);
		return;
	}

	const token = env.LINE_CHANNEL_ACCESS_TOKEN;

	if (!token) {
		// トークン未設定の場合はスキップ
		console.log(`[LINE] トークン未設定のためスキップ。宛先: ${toUserId}、メッセージ: ${message}`);
		return;
	}

	let res: Response;
	try {
		res = await fetch('https://api.line.me/v2/bot/message/push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				to: toUserId,
				messages: [{ type: 'text', text: message }]
			})
		});
	} catch (e) {
		console.error('[LINE] ネットワークエラー:', e);
		throw new AppError(
			'BAD_GATEWAY',
			502,
			'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		);
	}

	if (!res.ok) {
		const body = await res.text().catch(() => '(response body unavailable)');
		console.error(`[LINE] 送信失敗: status=${res.status}, body=${body}`);
		throw new AppError(
			'BAD_GATEWAY',
			502,
			'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		);
	}
}

/**
 * role に対応する LINE ユーザー ID を返す。
 * role が primary → LINE_USER_ID_PRIMARY
 * role が spouse  → LINE_USER_ID_SPOUSE
 */
export function getLineUserId(
	env: Env,
	role: 'primary' | 'spouse' | null | undefined
): string | undefined {
	if (role === 'primary') return env.LINE_USER_ID_PRIMARY;
	if (role === 'spouse') return env.LINE_USER_ID_SPOUSE;
	return undefined;
}

/**
 * 送信者 role から通知先 role を返す（primary → spouse, spouse → primary）。
 */
export function getOppositeRole(
	role: 'primary' | 'spouse' | null | undefined
): 'primary' | 'spouse' | null {
	if (role === 'primary') return 'spouse';
	if (role === 'spouse') return 'primary';
	return null;
}
