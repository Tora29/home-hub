# Testing

テスト戦略と実装規約。SDD（Spec-Driven Development）に基づき、**spec.md の全 AC に対応するテストケースを必ず作成する**。

ディレクトリ構成は `specs/infra-spec.md` を正とする。

## テスト哲学

- Testing Trophy に準拠: **「Write tests. Not too many. Mostly integration.」**
- ユニットテストを細かく書きすぎない。実装の詳細でなく仕様（AC）を検証する
- Cloudflare D1 はモックしない。`@cloudflare/vitest-pool-workers` で本物のバインディングを使う
- 全 AC に対応するテストがない場合、実装は未完とみなす

## テスト種別と対象

| 種別          | ツール                                     | 対象ファイル                           | 実行環境                   |
| ------------- | ------------------------------------------ | -------------------------------------- | -------------------------- |
| Unit (server) | Vitest                                     | `+server.ts`, `schema.ts`, `errors.ts` | Node                       |
| Integration   | Vitest + `@cloudflare/vitest-pool-workers` | `service.ts`, `+page.server.ts`        | Workers (Miniflare)        |
| Unit (client) | Vitest + Playwright                        | `*.svelte`, `components/`              | Chromium (headless)        |
| E2E           | Playwright                                 | ユーザーフロー全体                     | Preview ビルド (port 4173) |

### 「スキーマ」の使い分け

このプロジェクトには2種類のスキーマがある。混同しないこと。

| ファイル                         | 種類                           | テスト対象          |
| -------------------------------- | ------------------------------ | ------------------- |
| `src/lib/server/tables.ts`       | Drizzle テーブル定義（型宣言） | 対象外              |
| `src/routes/{feature}/schema.ts` | Zod バリデーションスキーマ     | **Unit テスト対象** |

Zod スキーマは純粋関数（`.parse()` / `.safeParse()`）なので D1 不要でユニットテストが書ける。

### AC 番号とテスト種別の対応

> **適用スコープ**: このマッピングはサーバーサイドのテストファイル（`service.ts` / `schema.ts` / `+server.ts`）に適用する。
> `page.svelte.test.ts` などの Unit client テストも正常系 AC を参照してよい（Integration テストに限定されない）。

| AC 範囲               | 内容                               | テスト種別（サーバーサイド） |
| --------------------- | ---------------------------------- | ---------------------------- |
| AC-001〜099（正常系） | DB を含む正常動作                  | Integration テスト（実 D1）  |
| AC-101〜199（異常系） | バリデーションエラー・権限エラー等 | Zod schema Unit テスト       |
| AC-201〜299（境界値） | 文字数上限・数値範囲等             | Zod schema Unit テスト       |

> バリデーション系の AC を Integration テストで書くと D1 セットアップが毎回走り低速になる。
> Zod schema の Unit テストで代替することで高速・シンプルに保つ。
>
> **`+server.ts` ハンドラの Unit テスト（`+server.test.ts`）について**:
> バリデーションエラー（AC-101〜199）はバリデーション失敗でサービスコールが発生しないため、**service のモック不要**。
> 正常系（AC-001〜099）は `service.integration.test.ts` で DB レベルから検証するため、ハンドラ単体の Integration テストは書かない。

## ファイル命名・配置

`specs/infra-spec.md` のディレクトリ構成に従う。

```
src/routes/{feature}/
  schema.ts
  schema.test.ts                       ← Zod バリデーション Unit テスト
  +server.ts
  +server.test.ts                      ← API ハンドラ Unit テスト
  +page.svelte
  page.svelte.test.ts                  ← 画面コンポーネント Unit テスト（`+` は SvelteKit 予約のため省略）
  +page.server.ts
  page.server.integration.test.ts      ← load 関数 Integration テスト（`+` は SvelteKit 予約のため省略）
  service.ts
  service.integration.test.ts          ← サービス層 Integration テスト
  components/
    {ComponentName}.svelte
    {ComponentName}.svelte.test.ts     ← コンポーネント Unit テスト

src/lib/server/
  errors.ts
  errors.test.ts                       ← AppError Unit テスト

e2e/
  {feature}.e2e.ts                     ← E2E テスト
```

## テスト-仕様連携

### AC との紐付け（必須）

全テストケース名に `[SPEC: AC-XXX]` を含める。AC のないテストは書かない。

```typescript
describe('createDishSchema', () => {
  test('[SPEC: AC-001] 正しいデータは parse できる', () => { ... });
  test('[SPEC: AC-101] name が空の場合は VALIDATION_ERROR になる', () => { ... });
  test('[SPEC: AC-201] name が100文字の場合は parse できる', () => { ... });
});

describe('createDish', () => {
  test('[SPEC: AC-001] 料理を作成できる', async () => { ... });  // Integration
});
```

### テストケース命名規則

- 必ず `describe` + `test()` の組み合わせで記述する（**E2E のみ** `test.describe()` + `test()`）
- `describe` にはテスト対象の関数名・スキーマ名・コンポーネント名を指定する
- `test()` の説明は「〜できる」「〜の場合は〜」の日本語形式

## カバレッジ

### 対象ファイル

```
src/routes/**/*.ts    ← schema.ts, +server.ts, service.ts 等
src/lib/**/*.ts       ← errors.ts 等
```

### 対象外ファイル

```
src/lib/server/db.ts          ← DB 接続設定（インフラ）
src/lib/server/tables.ts      ← Drizzle テーブル定義（型宣言）
src/lib/server/auth.ts        ← Better Auth 設定（サードパーティ）
src/lib/index.ts              ← barrel export
src/hooks.server.ts           ← 認証ガード・セッション注入（フレームワーク設定）
src/app.d.ts
**/*.test.ts
**/*.integration.test.ts
**/*.svelte.test.ts
```

### 目標値

| 指標           | 目標     |
| -------------- | -------- |
| 関数カバレッジ | 80% 以上 |
| 行カバレッジ   | 80% 以上 |

## コンポーネントテストの注意事項

### セレクタの選択（`data-testid.md` 参照）

セレクタの優先順位は `.claude/rules/data-testid.md` が唯一の定義元。要約:

| テスト種別                        | 優先順位                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| Unit / Component テスト（Vitest） | `getByRole` → `getByLabelText` → `getByText` → `getByTestId`（最終手段） |
| E2E テスト（Playwright）          | `getByTestId` → `getByRole` → `getByText`                                |

Unit / Component テストで `getByRole` が使えるのに `getByTestId` を使わない。
`getByRole` を優先することでアクセシビリティの問題も同時に検出できる。

```typescript
// ✅ 正しい（Unit/Component テスト: getByRole 優先）
page.getByRole('button', { name: '追加' }).element().click();
await expect.element(page.getByRole('listitem')).toBeInTheDocument();

// ❌ 誤り（role/text で一意に取得できるのに getByTestId を使う）
page.getByTestId('add-button').element().click();
```

---

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

### レスポンシブ（モバイル/デスクトップ）の振る舞いはコンポーネントテストで検証しない

`vite.config.ts` に `viewport: { width: 1280, height: 800 }` が設定されており、  
テスト内で `page.viewport(375, 812)` を呼んでも **CSS メディアクエリには反映されない**。

そのため以下の挙動はコンポーネントテスト（`*.svelte.test.ts`）では検証できない：

- `md:hidden` / `block md:hidden` 等 Tailwind レスポンシブクラスの切り替え
- モバイル専用 UI（ハンバーガーメニュー、行メニューボタン等）の表示/非表示

**→ これらは E2E テスト（Playwright）で検証する。**  
E2E テストでは `page.setViewportSize({ width: 375, height: 812 })` が正常に機能する。

```typescript
// ✅ E2E テストで viewport を変更
test('[SPEC: AC-016] モバイルで行メニューが開く', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	// ...
});

// ❌ コンポーネントテストでは viewport 変更が CSS に反映されない
test('[SPEC: AC-016] ...', async () => {
	await page.viewport(375, 812); // 効果なし
	// ...
});
```

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

Vitest browser mode の公式推奨は `userEvent.click()` from `@vitest/browser/context` だが、
`userEvent.click()` は内部で Playwright の CDP を使うため `locator.click()` と同様にナビゲーション完了を待機し、  
SvelteKit 環境では 5〜15 秒かかる／タイムアウトする問題がある。

ナビゲーションを伴わないボタン（バリデーション・リスト操作等）は `element().click()` で  
ネイティブ DOM click を使い、`flushSync()` で Svelte の状態更新を即時反映させる。  
これは SvelteKit + Vitest browser mode 固有の回避策であり、一般的な Vitest の推奨パターンとは異なる。

```typescript
import { flushSync } from 'svelte';

// ✅ 正しい（ナビゲーションなし・即時 DOM 更新が必要な場合）
// Unit/Component テストではセレクタは getByRole 優先（data-testid.md 参照）
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

**`flushSync` が不要なケース：**

- `await expect.element(...).toBeVisible()` など、ポーリングで待機するアサーションの前

## テストコマンド

```bash
# Unit テスト（watch モード）
npm run test:unit

# Unit テスト（単発実行）
npm run test:unit -- --run

# Integration テスト（単発実行）
npm run test:integration -- --run

# カバレッジ計測
npm run test:unit -- --run --coverage

# E2E テスト
npm run test:e2e

# 全テスト（CI 用）: unit + integration + e2e
npm run test
```

## なぜ必要か

- scaffold-test-unit / scaffold-test-e2e スキルがテストコードを生成する際の規約
- test-and-fix スキルがテスト実行コマンドを判断する際の参照先
- spec-coverage スキルがカバレッジ分析する際の基準

## 参照するスキル

- scaffold-test-unit, scaffold-test-e2e, test-and-fix, spec-coverage
