---
name: scaffold-test-e2e
description: >
  Playwright E2E テストファイルを生成・差分更新するスキル。
  「E2Eテストを書いて」「{feature}のE2Eを作って」「E2Eを更新して」「E2Eテストを追加して」
  など、E2E テストの新規作成・追加・修正に関するリクエストがあれば必ず使用すること。
  testing.md・Playwright ベストプラクティスに完全準拠した e2e/{feature}.e2e.ts を生成する。
---

# scaffold-test-e2e

Playwright E2E テストを生成・差分更新するスキル。

---

## Step 0: storageState の確認（初回のみ）

`playwright.config.ts` を Read して `use: { storageState }` が設定済みか確認する。

**未設定の場合**、以下の修正を行ってから先に進む。

### global-setup.ts への追記

既存のユーザー作成・シード処理の末尾に認証状態の保存処理を追加する。
global-setup.ts 全体を Read してから追記箇所を特定し Edit する。

```typescript
// 既存のユーザー作成・シード処理の後に追加
import { chromium } from '@playwright/test';
import * as fs from 'fs';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${BASE_URL}/login`);
await page.getByTestId('login-email-input').fill(TEST_EMAIL);
await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
await page.getByTestId('login-submit-button').click();
await page.waitForURL(`${BASE_URL}/`);
fs.mkdirSync('e2e/.auth', { recursive: true });
await context.storageState({ path: 'e2e/.auth/user.json' });
await browser.close();
```

### playwright.config.ts への追記

`use:` ブロックに `storageState` を追加する。

```typescript
use: {
  storageState: 'e2e/.auth/user.json',
},
```

### .gitignore への追記

```
e2e/.auth/
```

---

## Step 1: feature 確認

引数から feature 名を取得する。指定がなければ `src/routes/` を列挙してユーザーに確認する。

---

## Step 2: コンテキスト収集

以下を Read する。存在しないファイルはスキップしてよい。

```
src/routes/{feature}/+page.svelte
src/routes/{feature}/+page.server.ts
src/routes/{feature}/+server.ts
src/routes/{feature}/_lib/schema.ts
src/routes/{feature}/components/        （Glob で一覧取得）
specs/{feature}/spec.md                 （AC 一覧の参照用）
```

**差分更新の場合**は `e2e/{feature}.e2e.ts` も Read する。

---

## Step 3: シナリオ設計

収集した実装から以下のカテゴリでシナリオを導出する。

| カテゴリ       | 導出元                     | 検証内容                               |
| -------------- | -------------------------- | -------------------------------------- |
| 初期表示       | +page.svelte               | 主要要素の表示・見出し・ラベル         |
| 一覧           | +page.server.ts の load    | データ一覧の表示・件数                 |
| 作成           | POST エンドポイント        | フォーム入力 → 送信 → 一覧への反映     |
| 編集           | PUT エンドポイント         | 編集フォーム → 保存 → 一覧への反映     |
| 削除           | DELETE エンドポイント      | 確認ダイアログ → 削除 → 一覧から消える |
| バリデーション | schema.ts のルール         | 必須・文字数・形式のエラーメッセージ   |
| 空状態         | +page.svelte の empty 要素 | 0 件時のメッセージ表示                 |
| レスポンシブ   | モバイル固有 UI            | viewport 変更での表示切り替え          |

---

## Step 4: 新規生成 or 差分更新

### 新規生成（ファイルなし）

下記「生成パターン」に従いファイル全体を Write する。

### 差分更新（ファイルあり）

1. 既存テストの `test.describe` / `test()` 名を列挙する
2. Step 3 のシナリオと照合する
3. **不足シナリオ** → `test()` または `test.describe` ブロックを追加
4. **実装変更で古くなったテスト** → Edit で修正
5. ファイルヘッダーの `@covers` を最新 AC に更新

> 既存テストの削除は行わない。削除が必要なケースはユーザーに提示して確認を取る。

---

## 生成パターン

### ファイルヘッダー

```typescript
/**
 * @file E2Eテスト: {機能名}
 * @module e2e/{feature}.e2e.ts
 * @testType e2e
 *
 * @spec specs/{feature}/spec.md
 * @covers AC-001, AC-002, ...
 *
 * @scenarios
 * - {シナリオ1}
 * - {シナリオ2}
 *
 * @pages
 * - /{feature} - {画面名}
 */
import { test, expect } from '@playwright/test';
```

storageState 採用のため `login()` ヘルパーは不要。

### API ヘルパー

テストデータの操作は API 経由で行い、UI 操作とは分離する。

```typescript
async function create{Entity}(
  page: import('@playwright/test').Page,
  data: { name: string; [key: string]: unknown }
): Promise<{ id: string }> {
  const res = await page.request.post('/{feature}', {
    data,
    headers: { 'Content-Type': 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function delete{Entity}(
  page: import('@playwright/test').Page,
  id: string
): Promise<void> {
  await page.request.delete(`/{feature}/${id}`);
}
```

### テスト構造

```typescript
test.describe('{機能名} - {カテゴリ}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/{feature}');
  });

  test('[SPEC: AC-XXX] {業務要件を表す日本語説明}', async ({ page }) => {
    const item = await create{Entity}(page, { name: 'テストデータ' });
    try {
      // アサーション
    } finally {
      await delete{Entity}(page, item.id);
    }
  });
});
```

### セレクタ優先順位（Playwright ベストプラクティス）

```typescript
// 1. getByRole — ボタン・入力・リンク・見出し等（最優先）
page.getByRole('button', { name: '追加' });
page.getByRole('textbox', { name: '料理名' });
page.getByRole('heading', { name: 'レシピ一覧' });
page.getByRole('link', { name: '詳細を見る' });

// 2. getByLabel — ラベル付きフォームフィールド
page.getByLabel('メールアドレス');

// 3. getByText — テキストコンテンツ
page.getByText('まだデータがありません');

// 4. getByPlaceholder — placeholder のある入力
page.getByPlaceholder('例: カレーライス');

// 5. getByTestId — 上記で特定できない要素のみ
page.getByTestId('expense-month-select');
```

### レスポンシブテスト

```typescript
test.describe('{機能名} - モバイル', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('[SPEC: AC-XXX] モバイルで{操作}できる', async ({ page }) => {
		// CSS メディアクエリが正しく反映される
	});
});
```

### アサーションの品質基準

```typescript
// ✅ 具体的な値で検証する
await expect(page.getByRole('listitem')).toHaveCount(3);
await expect(page.getByRole('alert')).toHaveText('料理名は必須です');
await expect(page.getByRole('heading', { name: 'レシピ一覧' })).toBeVisible();

// ❌ 存在確認だけで終わらせない
await expect(page.getByRole('listitem')).not.toHaveCount(0); // 避ける
await expect(page.getByRole('alert')).toBeVisible(); // 避ける

// ✅ Svelte {#if} で DOM 削除される要素
await expect(page.getByTestId('recipes-empty')).not.toBeVisible(); // OK
await expect(page.getByTestId('recipes-empty')).toBeHidden(); // OK
// ※ toBeInTheDocument() は Playwright に存在しない

// ✅ ナビゲーション後は waitForURL
await page.getByRole('button', { name: '詳細' }).click();
await page.waitForURL('**/{feature}/**');

// ❌ waitForTimeout は使わない（Playwright の auto-wait を信頼する）
await page.waitForTimeout(1000); // 禁止
```

---

## Step 5: 型チェック

```bash
npx tsc --noEmit
```

エラーがあれば修正してから完了とする。
