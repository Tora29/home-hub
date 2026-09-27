/**
 * @file ヘルパー: 名前付きエンティティ CRUD フォームの共通処理
 * @module src/lib/utils/form-helpers.ts
 *
 * @description
 * 支出カテゴリ・筋トレ種目/カテゴリ管理の追加・編集・削除ハンドラで共通する
 * 「空/文字数バリデーション → fetch → エラー処理 → 成功コールバック → loading 解除」の流れを抽出したヘルパー。
 * 複数 feature から利用するため src/lib/utils/ に置く。
 */

type RequestOptions = {
	setError: (message: string) => void;
	setLoading: (loading: boolean) => void;
	request: () => Promise<Response>;
	onSuccess: () => void | Promise<void>;
};

async function runRequest({ setError, setLoading, request, onSuccess }: RequestOptions) {
	setLoading(true);
	try {
		const res = await request();
		if (!res.ok) {
			// JSON 以外（Cloudflare の 5xx HTML 等）が返った場合は汎用メッセージにフォールバック
			const err = (await res.json().catch(() => ({}))) as { message?: string };
			setError(err.message ?? '操作に失敗しました');
			return;
		}
		await onSuccess();
	} catch {
		setError('通信エラーが発生しました');
	} finally {
		setLoading(false);
	}
}

/**
 * 名前の必須・最大文字数バリデーションを行い、成功時のみ request を実行する。
 * バリデーションエラー・レスポンスエラー・通信エラーは setError に反映し、成功時のみ onSuccess を待つ。
 */
export async function submitNamedForm(
	options: RequestOptions & {
		name: string;
		maxLength: number;
		requiredMessage: string;
		maxLengthMessage: string;
	}
): Promise<void> {
	const { name, maxLength, requiredMessage, maxLengthMessage, setError } = options;

	setError('');
	if (!name.trim()) {
		setError(requiredMessage);
		return;
	}
	if (name.length > maxLength) {
		setError(maxLengthMessage);
		return;
	}
	await runRequest(options);
}

/**
 * 削除リクエストを実行する（バリデーション不要）。エラー処理と成功コールバックのみ共通化する。
 */
export async function submitDelete(options: RequestOptions): Promise<void> {
	options.setError('');
	await runRequest(options);
}
