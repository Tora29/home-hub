/**
 * @file ヘルパー: 種目/カテゴリ CRUD フォームの共通バリデーション・fetch 補助関数
 * @module src/lib/features/workout/exercises/components/form-helpers.ts
 * @feature workout/exercises
 *
 * @description
 * CategoryManagementCard / ExerciseListCard の追加・編集・削除ハンドラで共通する
 * 「空/文字数バリデーション → fetch → エラー処理 → 成功コールバック → loading解除」
 * の流れを抽出したヘルパー関数。
 */

/**
 * 名前の必須・最大文字数バリデーションを行い、成功時のみ request を実行する。
 * バリデーションエラー・レスポンスエラーは setError に反映し、成功時のみ onSuccess を呼ぶ。
 */
export async function submitNamedForm(options: {
	name: string;
	maxLength: number;
	requiredMessage: string;
	maxLengthMessage: string;
	setError: (message: string) => void;
	setLoading: (loading: boolean) => void;
	request: () => Promise<Response>;
	onSuccess: () => void;
}): Promise<void> {
	const {
		name,
		maxLength,
		requiredMessage,
		maxLengthMessage,
		setError,
		setLoading,
		request,
		onSuccess
	} = options;

	setError('');
	if (!name.trim()) {
		setError(requiredMessage);
		return;
	}
	if (name.length > maxLength) {
		setError(maxLengthMessage);
		return;
	}

	setLoading(true);
	try {
		const res = await request();
		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			setError(err.message ?? 'エラーが発生しました');
			return;
		}
		onSuccess();
	} finally {
		setLoading(false);
	}
}

/**
 * 削除リクエストを実行する（バリデーション不要）。エラー処理と成功コールバックのみ共通化する。
 */
export async function submitDelete(options: {
	setError: (message: string) => void;
	setLoading: (loading: boolean) => void;
	request: () => Promise<Response>;
	onSuccess: () => void;
}): Promise<void> {
	const { setError, setLoading, request, onSuccess } = options;

	setError('');
	setLoading(true);
	try {
		const res = await request();
		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			setError(err.message ?? 'エラーが発生しました');
			return;
		}
		onSuccess();
	} finally {
		setLoading(false);
	}
}
