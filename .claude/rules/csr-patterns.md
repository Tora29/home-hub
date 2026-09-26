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
			// JSON 以外（Cloudflare の 5xx HTML 等）が返った場合は汎用メッセージにフォールバック
			const err = (await res.json().catch(() => ({}))) as { message?: string };
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
結果は **成功 / 古い（より新しいリクエストあり）/ 失敗** の 3 値で返し、ロールバックは「失敗」のときだけ行う。

```typescript
let fetchSeq = 0;

// 'stale' = より新しいリクエストが発行済み（ロールバック不要）
async function fetchData(): Promise<'ok' | 'stale' | 'error'> {
	const seq = ++fetchSeq;
	try {
		const res = await fetch(`/endpoint?${params}`);
		if (seq !== fetchSeq) return 'stale';
		if (!res.ok) return 'error';
		const json = (await res.json()) as Data;
		if (seq !== fetchSeq) return 'stale'; // json() 待ちの間に追い越された場合
		data = json;
		return 'ok';
	} catch {
		return seq === fetchSeq ? 'error' : 'stale';
	}
}
```

- `fetchSeq` は `$state` にしない（リアクティブ更新が不要なため）
- boolean で返すと「古いレスポンス」も失敗扱いになり、ロールバックが**新しい選択を上書き**する（例: month→all→month→all の連打で表示と選択がずれる）
- 通信自体を止めたい場合は `AbortController` で前のリクエストを `abort()` してもよい（`AbortError` は `'stale'` 扱い）

```typescript
async function switchPeriod(next: 'month' | 'all') {
	const prev = period;
	period = next;
	const result = await fetchData();
	if (result === 'error') period = prev; // 失敗時のみロールバック
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
	const params = new URLSearchParams({ month: select.value });
	await goto(`/expenses?${params}`, { keepFocus: true, replaceState: true, noScroll: true });
}
```

- `replaceState: true` でブラウザ履歴を汚さない
- `keepFocus: true` で選択中の要素のフォーカスを維持する
- `noScroll: true` でスクロール位置を維持する
- クエリ文字列は `URLSearchParams` で組み立てる（文字列連結だとエンコード漏れが起きる）

---

## SSR 初期値との整合

props（SSR の `data` 等）を初期値にするローカル状態は、**props 変化時にどうしたいか**で書き分ける。

| 目的                                                                | 書き方                                            |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| props 変化（`invalidateAll()` 等）に追従しつつ CSR でも上書き       | `$derived(data.summary)`（Svelte 5.25+ で代入可） |
| マウント時の値だけ使い、以後は props と切り離す（フォーム初期値等） | `$state(untrack(() => expense.amount))`           |

```typescript
// サーバーデータのミラー: invalidateAll() 後は新しい data に戻り、CSR fetch で上書きもできる
let summary = $derived<Summary>(data.summary);
async function refetch() {
	summary = await (await fetch('/dashboard/summary')).json();
}

// フォーム初期値: 入力中に親の props が変わっても値を保持する
import { untrack } from 'svelte';
let amountRaw = $state(untrack(() => (expense ? String(expense.amount) : '')));
```

- `$state(x)` の初期値は**マウント時に 1 回だけ評価**される。`untrack()` の有無で「`data` 変化のたびにリセット」されることはない
- `untrack()` の役割は「props を初期値にしか使わない」意図の明示と `state_referenced_locally` 警告の抑制
- `$state(untrack(...))` でサーバーデータを持つと `invalidateAll()` 後も**古い値のまま**になる点に注意

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
