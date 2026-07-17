# CSR Patterns

クライアントサイドでの fetch・状態管理・データ再取得の実装規約。

---

## 基本 fetch フロー

```typescript
async function handleSomeAction() {
	isLoading = true;
	errorMessage = '';
	try {
		const res = await fetch('/feature/endpoint', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			errorMessage = err.message ?? '操作に失敗しました';
			return;
		}
		// 成功処理
		await invalidateAll();
	} catch {
		errorMessage = '通信エラーが発生しました';
	} finally {
		isLoading = false;
	}
}
```

- `res.ok` を必ずチェックする。`!res.ok` のとき `res.json()` からエラーメッセージを取得する
- catch は `catch {}` で省略可（型を使わない場合）
- `finally` で `isLoading = false` を確実に実行する

---

## 類似フォームの共通ヘルパー抽出

同一ページ・同一コンポーネントに「バリデーション → fetch → エラー処理 → ローディング解除」が
ほぼ同じ形で繰り返される複数フォーム（例: カテゴリ/種目の追加・編集・削除）がある場合、
定型フローをヘルパー関数に抽出する（`{feature}/components/form-helpers.ts` 等に配置）。

```typescript
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
	// バリデーション → request() 実行 → エラー処理 → onSuccess の定型フローを共通化
}
```

- 呼び出し側は `name` / `request` / `onSuccess` 等を渡すだけになり、個々のハンドラから重複コードが消える
- フォームが 1〜2 個しかない場合は抽出せず、素直に「基本 fetch フロー」をそのまま書く

---

## ローディング状態管理

```typescript
let isLoading = $state(false);
let errorMessage = $state('');
```

ボタンの `disabled` と連動させる。

```svelte
<Button disabled={isLoading} onclick={handleDelete}>
	{isLoading ? '削除中...' : '削除'}
</Button>
```

複数の操作が同一ページにある場合は操作ごとに個別の `isLoading` フラグを持つ。

```typescript
let deleteLoading = $state(false);
let approveLoading = $state(false);
let requestLoading = $state(false);
```

---

## データ再取得

CSR 操作後は `invalidateAll()` で SSR `load` 関数を再実行してデータを最新化する。

```typescript
import { invalidateAll } from '$app/navigation';

// 操作成功後
await invalidateAll();
```

- ページ遷移が必要な場合は `goto()` を使う（`invalidateAll()` は不要）
- `invalidateAll()` は `await` する（非同期で UI が更新されるため）

---

## 競合回避（fetchSeq）

フィルタ変更等で連続リクエストが発生する場合、古いレスポンスで画面が上書きされないよう `fetchSeq` で最新リクエストのみを反映する。

```typescript
let fetchSeq = 0;

async function fetchData(): Promise<boolean> {
	const seq = ++fetchSeq;
	const res = await fetch(`/endpoint?${params}`);
	if (res.ok && seq === fetchSeq) {
		// 最新リクエストのみ適用
		data = await res.json();
		return true;
	}
	return false;
}
```

- `fetchSeq` は `$state` にしない（リアクティブ更新が不要なため）
- 失敗時に前の状態に戻す場合は、呼び出し元でロールバックする

```typescript
async function switchPeriod(next: 'month' | 'all') {
	const prev = period;
	period = next;
	const ok = await fetchData();
	if (!ok) period = prev; // 失敗時はロールバック
}
```

---

## エラー表示

フィールドエラーはフォーム内のフィールド近くに表示する。
単一エラーは画面上部またはダイアログ内に `$state` で管理する。

```svelte
{#if actionError}
	<p role="alert" class="text-sm text-destructive">{actionError}</p>
{/if}
```

- `role="alert"` を付与することでスクリーンリーダーが変更を通知できる
- 次の操作開始時に `errorMessage = ''` でクリアする

---

## 月切り替え（URL パラメータ）

月フィルタ等のページ状態は URL クエリパラメータに持たせ、`goto()` で更新する。

```typescript
async function handleMonthChange(e: Event) {
	const select = e.target as HTMLSelectElement;
	await goto(`/expenses?month=${select.value}`, { keepFocus: true, replaceState: true });
}
```

- `replaceState: true` でブラウザ履歴を汚さない
- `keepFocus: true` で選択中の要素のフォーカスを維持する

---

## SSR 初期値との整合

SSR で取得したデータを CSR で更新する場合、初期値は `untrack()` で取得する。

```typescript
import { untrack } from 'svelte';

let summary = $state<Summary>(untrack(() => data.summary));
```

`untrack()` なしだと `data` の変化のたびに `summary` がリセットされる。

---

## `$app/navigation` のモック（テスト）

`goto` / `invalidateAll` を使うページコンポーネントのテストでは必ずモックする（→ `testing.md` 参照）。

```typescript
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));
```

---

## なぜ必要か

- 競合回避・ローディング管理・エラー表示を統一してバグを防ぐため
