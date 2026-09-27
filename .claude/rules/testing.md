# Testing

テスト戦略と実装規約。画面ファイルヘッダーの `@api` / `+server.ts` の `@endpoints` コメントと `data-testid` 属性を一次仕様として、**業務要件を表すテストケースを作成する**。

ファイル配置は `directory-structure.md` の 2 層アーキテクチャに従う。

## テスト哲学

- Testing Trophy に準拠: **「Write tests. Not too many. Mostly integration.」**
- ユニットテストを細かく書きすぎない。実装の詳細でなく業務要件を検証する
- Cloudflare D1 はモックしない。`@cloudflare/vitest-pool-workers` で本物のバインディングを使う
- テストが GREEN = 業務要件を満たしている。テストが落ちた = ドリフト検出

## テスト種別と対象

| 種別          | ツール                                     | 対象ファイル                                                               | 実行環境                                      |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------- |
| Unit (server) | Vitest                                     | `routes/+server.ts`, `lib/features/{feature}/schema.ts`, `lib/server/*.ts` | Node                                          |
| Integration   | Vitest + `@cloudflare/vitest-pool-workers` | `lib/features/{feature}/server/*.ts`（`+page.server.ts` は任意）           | Workers (Miniflare)                           |
| Unit (client) | Vitest + Playwright                        | `lib/features/{feature}/components/*.svelte`                               | Chromium (headless)                           |
| E2E           | Playwright                                 | ユーザーフロー全体                                                         | 本番ビルド + `wrangler pages dev` (port 4173) |

### 「スキーマ」の使い分け

このプロジェクトには2種類のスキーマがある。混同しないこと。

| ファイル                               | 種類                           | テスト対象          |
| -------------------------------------- | ------------------------------ | ------------------- |
| `src/lib/server/tables.ts`             | Drizzle テーブル定義（型宣言） | 対象外              |
| `src/lib/features/{feature}/schema.ts` | Zod バリデーションスキーマ     | **Unit テスト対象** |

Zod スキーマは純粋関数（`.parse()` / `.safeParse()`）なので D1 不要でユニットテストが書ける。

### テスト種別の選択基準

| 内容                                        | テスト種別           |
| ------------------------------------------- | -------------------- |
| DB を含む正常動作（登録・取得・更新・削除） | Integration（実 D1） |
| バリデーションルール（文字数・必須・型）    | Unit（Zod schema）   |
| 重複・存在チェック                          | Integration（実 D1） |
| 境界値（文字数の上限・下限）                | Unit（Zod schema）   |

> バリデーション系を Integration テストで書くと D1 セットアップが毎回走り低速になる。
> Zod schema の Unit テストで代替することで高速・シンプルに保つ。
>
> **`+server.ts` ハンドラの Unit テスト（`server.test.ts`）について**:
> バリデーション失敗でサービスコールが発生しないため、**service のモック不要**。
> 正常系は `service.integration.test.ts` で DB レベルから検証するため、ハンドラ単体の Integration テストは書かない。
> `vi.mock(service)` や「service が呼ばれないこと」の検証もしない（実装詳細）。レスポンスの status / `code` / `fields` を検証する。
> 入力バリデーションのないハンドラ（body なしの `(actions)` 等）は `server.test.ts` を作らない（検証対象がないため）。
>
> **`+page.server.ts` について**: service 呼び出しのみの薄い load はテスト不要。クエリ解釈等のロジックを持つ場合のみ
> Integration テストを書く（`vitest.integration.config.ts` で `$app/environment` は `dev=false` のスタブに解決される。
> `$app/navigation` / `$env/*` は未対応）。

## ファイル命名・配置

テストファイルは実装ファイルのコロケーション配置を原則とする。

- **実装層のテスト** は `src/lib/features/{feature}/` に実装と隣接して置く
- **ルーティング層のテスト** は `src/routes/{feature}/` に置く
- コンポーネントテストはコンポーネントと同階層に置く（書く場合は 1:1 対応）
- コンポーネントテストは業務ロジック（条件表示・入力検証・操作フロー）を持つものに書く。
  見た目だけの共通 UI や、feature コンポーネントに委譲するだけの `+page.svelte` には書かなくてよい

```
# 実装層（コロケーションの主体）
src/lib/features/{feature}/
  schema.ts
  schema.test.ts                           ← Zod バリデーション Unit テスト
  types.ts                                 ← 任意
  components/
    {ComponentName}.svelte
    {ComponentName}.svelte.test.ts         ← コンポーネント Unit テスト
  server/
    service.ts
    service.integration.test.ts            ← サービス層 Integration テスト
    {responsibility}.ts                    ← 責務が複数ある場合はファイル分割
    {responsibility}.integration.test.ts

# ルーティング層
src/routes/{feature}/
  (actions)/                               ← アクション系（URL に影響しない）
    {action}/
      +server.ts
      server.test.ts                       ← ハンドラ Unit テスト
  [id]/
    (actions)/
      {action}/
        +server.ts
        server.test.ts
    +server.ts
    server.test.ts
  +page.svelte
  +page.server.ts
  +server.ts
  page.svelte.test.ts                      ← +page.svelte Unit テスト
  server.test.ts                           ← +server.ts Unit テスト

# 共通サーバーコード
src/lib/server/
  errors.ts
  errors.test.ts                           ← AppError Unit テスト

# E2E
e2e/
  {feature}.e2e.ts
```

## テスト-仕様連携

### テストケース命名規則

- 必ず `describe` + `test()` の組み合わせで記述する（**E2E のみ** `test.describe()` + `test()`）
- `describe` にはテスト対象の関数名・スキーマ名・コンポーネント名を指定する
- `test()` の説明は業務要件を表す日本語で記述する

| ケース    | フォーマット                       | 例                                                                 |
| --------- | ---------------------------------- | ------------------------------------------------------------------ |
| 正常系    | `{条件}で{操作}できる`             | `正しいデータで支出を登録できる`                                   |
| 異常系    | `{条件}の場合、{エラー内容}が返る` | `カテゴリが空の場合、VALIDATION_ERROR「カテゴリは必須です」が返る` |
| 境界値 OK | `{条件}の場合、{操作}できる`       | `金額が9,999,999円の場合、登録できる`                              |
| 境界値 NG | `{条件}の場合、{エラー内容}が返る` | `金額が10,000,000円の場合、VALIDATION_ERROR が返る`                |

```typescript
describe('expenseCreateSchema', () => {
  test('正しいデータで支出を登録できる', () => { ... });
  test('カテゴリが空の場合、VALIDATION_ERROR「カテゴリは必須です」が返る', () => { ... });
  test('金額が9,999,999円の場合、登録できる', () => { ... });
  test('金額が10,000,000円の場合、VALIDATION_ERROR が返る', () => { ... });
});

describe('createExpense', () => {
  test('正しいデータで支出を登録できる', async () => { ... });  // Integration
});
```

#### 使わないパターン

- `[SPEC: AC-XXX]` 形式のテスト名
- 関数の内部実装を確認するだけのテスト
- 常に通る自明なテスト（フィールドの存在確認等）

## 認証ガード（`hooks.server.ts`）の検証

`hooks.server.ts` はユニットテストを書かず、以下を E2E（`e2e/hooks.e2e.ts`）で必ず検証する。

- 未認証の画面遷移 → `/login` へ 302
- 未認証の fetch → JSON 401
- レスポンスにセキュリティヘッダー（`X-Frame-Options` 等）が付与される
- role 限定パス（`MAIN_ONLY_PREFIXES`）の API を role≠main で呼ぶ → JSON 403

> カバレッジ計測は行わない（`@vitest/coverage-v8` 未導入）。テストの十分性は「業務要件ごとにテストケースがあるか」で判断する。

## コンポーネントテストの注意事項

### `render()` は必ず `await` する

`vitest-browser-svelte` 3 以降の `render()` は Promise を返す。`await render(Component, props)` と書く
（`@typescript-eslint/no-floating-promises` でも検出される）。

### `toBeVisible()` と `toBeInTheDocument()` の使い分け

| 状況                                                 | 正しいマッチャー          |
| ---------------------------------------------------- | ------------------------- |
| `{#if ...}` による条件レンダリングで要素が存在しない | `not.toBeInTheDocument()` |
| CSS（`display: none` / `hidden` クラス等）で非表示   | `not.toBeVisible()`       |

Svelte の `{#if ...}` は DOM から要素を除去するため、`not.toBeVisible()` を使うと  
`Cannot find element with locator: getByTestId(...)` エラーが発生する。

```typescript
// ✅ 正しい（条件レンダリング）
await expect.element(page.getByTestId('expense-menu')).not.toBeInTheDocument();

// ❌ 誤り（DOM に存在しないのに visibility を確認しようとする）
await expect.element(page.getByTestId('expense-menu')).not.toBeVisible();
```

### レスポンシブ（モバイル/デスクトップ）の振る舞いは E2E で検証する

`page.viewport(375, 812)` 自体は機能する（iframe が縮み、`matchMedia` / 素の `@media` は切り替わる。2026-09 に実測済み）。
ただしコンポーネントテストでは **`src/app.css`（Tailwind）が読み込まれない**（`+layout.svelte` でのみ import）ため、
`md:hidden` 等の Tailwind クラスはそもそも CSS として存在せず、viewport に関係なく効かない。

そのため以下はコンポーネントテスト（`*.svelte.test.ts`）では検証しない：

- `md:hidden` / `block md:hidden` 等 Tailwind レスポンシブクラスの切り替え
- モバイル専用 UI（ハンバーガーメニュー、行メニューボタン等）の表示/非表示

**→ これらは E2E テスト（Playwright）で検証する。**
E2E テストでは `page.setViewportSize({ width: 375, height: 812 })` で実アプリの CSS ごと検証できる。

```typescript
// ✅ E2E テストで viewport を変更
test('モバイルで行メニューが開く', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	// ...
});

// ❌ コンポーネントテスト: viewport は変わるが Tailwind CSS が未読込のため md:hidden 等は効かない
test('...', async () => {
	await page.viewport(375, 812);
	// ...
});
```

> どうしてもコンポーネントテストで検証する場合は、テストファイルで `import '../../../app.css'` のように
> Tailwind を読み込めば `md:` クラスも切り替わる（実測済み）。ただしテストが重くなるため原則 E2E に寄せる。

### `$app/navigation` / `$app/state` のモック（ページコンポーネントテスト必須）

`$app/navigation` や `$app/state` を import するページコンポーネント（`+page.svelte`）をテストする場合、
これらをモックしないと Playwright が「ナビゲーション完了待機」で最大 **15 秒**ブロックされ、テストがタイムアウトする。

```typescript
// ✅ 必須：$app/* を import するページのテストファイル先頭に追加
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/') }
}));
```

- `$app/navigation` のみ import するページ（例: ログインページ）も同様にモックする
- これを省略すると、ボタンクリック後に Playwright が SvelteKit のルーター初期化処理を  
  ナビゲーションとして検出し、長時間待機する

### `element().click()` + `flushSync()` パターン

Vitest browser mode の公式推奨は `userEvent.click()` from `vitest/browser` だが、
`userEvent.click()` は内部で Playwright の CDP を使うため `locator.click()` と同様にナビゲーション完了を待機し、  
SvelteKit 環境では 5〜15 秒かかる／タイムアウトする問題がある。

ナビゲーションを伴わないボタン（バリデーション・リスト操作等）は `element().click()` で  
ネイティブ DOM click を使い、`flushSync()` で Svelte の状態更新を即時反映させる。  
これは SvelteKit + Vitest browser mode 固有の回避策であり、一般的な Vitest の推奨パターンとは異なる。

```typescript
import { flushSync } from 'svelte';

// ✅ 正しい（ナビゲーションなし・即時 DOM 更新が必要な場合）
// Unit/Component テストではセレクタは getByRole 優先（E2E は data-testid 優先）
page.getByRole('button', { name: '追加' }).element().click();
flushSync(); // Svelte の pending state をすべて即時適用
expect((await page.getByRole('listitem').elements()).length).toBe(1);

// ✅ 非同期チェック（DOM が更新されるまで自動ポーリング）
page.getByRole('button', { name: '保存' }).element().click();
flushSync();
await expect.element(page.getByRole('alert')).toBeVisible(); // エラーメッセージは role="alert" 等

// ⚠️ locator.click() は遅い（ナビゲーション待機あり）
await page.getByRole('button', { name: '追加' }).click(); // 最初のクリックで 5〜15 秒かかる場合あり
```

**`flushSync` が必要なケース：**

- `element().click()` 直後に `elements()` でリスト件数を確認する場合
- `element().click()` 直後に同期的なアサーション（`expect(mock).toHaveBeenCalled()` など）をする場合

> `element()` の戻り値は `HTMLElement | SVGElement` 型のため、`click()` には `(... .element() as HTMLElement).click()` のキャストが必要な場合がある。

**`flushSync` が不要なケース：**

- `await expect.element(...).toBeVisible()` など、ポーリングで待機するアサーションの前

## E2E テストの注意事項

### Svelte `{#if ...}` による DOM 削除と Playwright マッチャー

Svelte の `{#if ...}` は条件が偽のとき DOM から要素を**物理削除**する。  
Playwright と Vitest では挙動が異なるため、テスト種別ごとに正しいマッチャーを使う。

| テスト種別               | DOM から削除された場合の `not.toBeVisible()` | 正しい記述                                |
| ------------------------ | -------------------------------------------- | ----------------------------------------- |
| Vitest（コンポーネント） | エラー（要素が見つからない）                 | `not.toBeInTheDocument()`                 |
| Playwright（E2E）        | **通過**（存在しない = 非表示 と判定）       | `not.toBeVisible()` または `toBeHidden()` |

Playwright では `not.toBeVisible()` が「DOM に存在しない」「CSS で非表示」の両方をカバーするため、  
E2E テストでは Vitest のような使い分けは不要。

```typescript
// ✅ E2E（Playwright）: {#if} で削除された要素
await expect(page.getByTestId('expense-menu')).not.toBeVisible(); // ← 安全
await expect(page.getByTestId('expense-menu')).toBeHidden(); // ← 同義

// ❌ E2E で間違いやすいパターン（Playwright には toBeInTheDocument がない）
// await expect(page.getByTestId('expense-menu')).not.toBeInTheDocument(); // 存在しないメソッド

// ✅ 要素が表示される（DOM に追加される）まで待機
await expect(page.getByTestId('expense-menu')).toBeVisible();
```

> **補足**: Playwright は内部でリトライ（auto-wait）するため、  
> アクション直後に要素が存在しなくても適切なタイムアウト内で自動的に待機する。  
> `flushSync()` は不要（Vitest + browser mode 固有の回避策）。

---

## テストデータの独立性

- Integration / E2E は DB を他テストと共有しうる前提で書く。`toBeGreaterThanOrEqual` 等「他データが混ざっても通る」アサーションで逃げず、
  固有の値（テスト専用の過去月・一意な名前）で絞り込むか、実行前後の差分で厳密に検証する
- 日付は `src/lib/utils/date.ts` のヘルパー（`getTodayDate` / `getCurrentMonth` / `addMonths`）で求める。
  月・日付をハードコードしない（`generateMonthOptions` の範囲外になると失敗する）。`toISOString().slice(0, 10)` / `getMonth()` 等は使わない
- E2E で作ったデータは `try/finally`（または `afterEach`）で API 経由で削除する。名前は seed と衝突しない一意な値にする
- 削除 API のないデータ（体重記録等）は 1 テスト内で前提作成〜検証を完結させ、テスト順序に依存させない
  （`e2e/global-setup.ts` が実行ごとに DB を初期化する）

## テストコマンド

```bash
# Unit テスト（watch モード）
npm run test:unit

# Unit テスト（単発実行）
npm run test:unit -- --run

# Integration テスト（単発実行）
npm run test:integration -- --run


# E2E テスト
npm run test:e2e

# 全テスト（CI 用）: unit + integration + e2e
npm run test
```

## なぜ必要か

- テスト追加・修正時にテスト種別・配置・実行コマンドを判断する際の参照先
