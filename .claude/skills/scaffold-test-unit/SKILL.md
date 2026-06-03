---
name: scaffold-test-unit
description: >
  ユニット・インテグレーション・コンポーネントテストファイルを生成・差分更新するスキル。
  「テストを書いて」「{feature}のテストを作って」「スキーマのテストを追加して」
  「コンポーネントテストを書いて」「結合テストを作って」など、
  E2E 以外のテスト作成・追加・修正に関するリクエストがあれば必ず使用すること。
  testing.md のルールと Vitest ベストプラクティスに完全準拠したテストを生成する。
---

# scaffold-test-unit

Schema Unit・Server Unit・Integration・Component の各テストファイルを生成・差分更新するスキル。

---

## テスト種別の判別

対象ファイルと目的からテスト種別を判断する。複数種別を同時に生成してよい。

| 種別        | 対象ファイル                           | 生成するテスト                                          | 実行コマンド                        |
| ----------- | -------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| Schema Unit | `_lib/schema.ts`                       | Zod バリデーションルール                                | `npm run test:unit -- --run`        |
| Server Unit | `+server.ts`                           | API ハンドラのバリデーション失敗系                      | `npm run test:unit -- --run`        |
| Integration | `_lib/service.ts`                      | DB を使う業務ロジック（権限・ページネーション・ソート） | `npm run test:integration -- --run` |
| Component   | `+page.svelte` / `components/*.svelte` | UI インタラクション・条件レンダリング                   | `npm run test:unit -- --run`        |

---

## Step 1: 対象確認

feature 名と種別を確認する。指定がなければ `src/routes/{feature}/` を列挙して確認する。

---

## Step 2: コンテキスト収集

テスト対象ファイルを Read する。存在しないファイルはスキップしてよい。

```
src/routes/{feature}/_lib/schema.ts       → Schema Unit / Server Unit 用
src/routes/{feature}/_lib/service.ts      → Integration 用
src/routes/{feature}/+server.ts           → Server Unit 用
src/routes/{feature}/+page.svelte         → Component 用
src/routes/{feature}/components/          → Component 用（Glob で一覧取得）
specs/{feature}/spec.md                   → AC 一覧（あれば）
```

---

## Step 3: 新規生成 or 差分更新

**新規生成**（ファイルなし）: 下記「種別ごとの生成パターン」に従い全体を生成する。

**差分更新**（ファイルあり）:

1. 既存テストの `describe` / `test()` 名を列挙する
2. 実装の変更箇所と照合する
3. 不足テスト → 追加、古くなったテスト → Edit で修正
4. 削除が必要なケースはユーザーに確認する

---

## 種別ごとの生成パターン

### 共通: ファイルヘッダー（file-headers.md 準拠）

```typescript
/**
 * @file テスト: {対象名}
 * @module src/routes/{feature}/{ファイル名}.test.ts
 * @testType unit   // または integration
 *
 * @target ./{対象ファイル名}.ts
 * @spec specs/{feature}/spec.md
 * @covers AC-001, AC-002, ...
 */
```

### 共通: テスト命名規則（testing.md 準拠）

```typescript
describe('{対象の関数名・スキーマ名・コンポーネント名}', () => {
  test('正しいデータで{操作}できる', () => { ... });
  test('{条件}の場合、{エラー内容}が返る', () => { ... });
  test('{条件}の場合、{操作}できる', () => { ... });     // 境界値 OK
  test('{条件}の場合、{エラー内容}が返る', () => { ... }); // 境界値 NG
});
```

`[SPEC: AC-XXX]` 形式は使わない。業務要件を日本語で直接表現する。

---

### Schema Unit（`schema.test.ts`）

Zod の `.safeParse()` を使い、バリデーションルールを直接検証する。DB 不要で高速。

```typescript
import { describe, test, expect } from 'vitest';
import { {entity}CreateSchema } from './{schema}';

describe('{entity}CreateSchema', () => {
  test('正しいデータで{エンティティ}を登録できる', () => {
    const result = {entity}CreateSchema.safeParse({ name: '有効な名前', ... });
    expect(result.success).toBe(true);
  });

  test('名前が空の場合、「名前は必須です」エラーが返る', () => {
    const result = {entity}CreateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('名前は必須です');
  });

  test('名前が100文字の場合、登録できる', () => {
    const result = {entity}CreateSchema.safeParse({ name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  test('名前が101文字の場合、バリデーションエラーが返る', () => {
    const result = {entity}CreateSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
```

- `vite.config.ts` に `requireAssertions: true` があるため全テストに `expect()` が必須
- エラーメッセージは schema.ts に定義された日本語文言をそのまま検証する
- 境界値（最小・最大・+1）を必ずテストする

---

### Server Unit（`server.test.ts`）

API ハンドラ層の検証。サービスをモックし、バリデーション失敗時の挙動に集中する。
正常系は Integration でカバーするためハンドラ単体では不要。

```typescript
import { describe, test, expect, vi } from 'vitest';
import { POST } from './+server';

vi.mock('./_lib/service', () => ({
  create{Entity}: vi.fn()
}));

describe('POST /{feature}', () => {
  test('リクエストボディが不正な場合、400 VALIDATION_ERROR が返る', async () => {
    const request = new Request('http://localhost/{feature}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });
    const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  test('バリデーション失敗時はサービスが呼ばれない', async () => {
    const { create{Entity} } = await import('./_lib/service');
    // 不正リクエスト送信
    expect(create{Entity}).not.toHaveBeenCalled();
  });
});
```

---

### Integration（`service.integration.test.ts`）

実 D1 DB を使い、E2E や Schema Unit では検証できないことだけをテストする。

**対象を絞る基準**:

- ✅ 他ユーザーのデータにアクセスできないこと（権限チェック）
- ✅ ページネーションの境界値（offset/limit の挙動）
- ✅ ソート順（NULL 扱い、複数キー）
- ✅ DB 制約（UNIQUE 違反、CASCADE 削除）
- ❌ 正常系 CRUD（E2E でカバー済み）
- ❌ バリデーション（Schema Unit でカバー済み）

```typescript
/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, test, expect, beforeAll } from 'vitest';
import { createDb } from '$lib/server/db';

// テストユーザーは crypto.randomUUID() で生成する（並列実行対応）
function makeUserId() { return crypto.randomUUID(); }

describe('{entity} service - 権限チェック', () => {
  test('他ユーザーのデータは取得できない', async () => {
    const db = createDb(env.DB);
    const ownerUserId = makeUserId();
    const otherUserId = makeUserId();
    // ownerUserId でデータ作成
    // otherUserId で取得 → 空配列 or NOT_FOUND
    expect(...).toBe(...);
  });
});
```

- `/// <reference types="@cloudflare/vitest-pool-workers/types" />` を必ず先頭に付与
- テストユーザーは `crypto.randomUUID()` で毎回生成し、テスト間の干渉を防ぐ
- `env.DB` は Miniflare が注入する実 D1 バインディング

---

### Component（`*.svelte.test.ts`）

UI インタラクションと条件レンダリングを検証する。

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import { flushSync } from 'svelte';

// $app/* を import するコンポーネントでは必須
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/') }
}));

describe('{ComponentName}', () => {
  test('ボタンをクリックすると{状態変化}が起きる', async () => {
    render({Component}, { props: { ... } });

    page.getByRole('button', { name: '追加' }).element().click();
    flushSync(); // Svelte の pending state を即時反映

    await expect.element(page.getByRole('listitem')).toBeVisible();
  });
});
```

**セレクタ優先順位**（testing.md 準拠）:

1. `getByRole('button', { name: '...' })` — ボタン・入力・リンク
2. `getByLabel('...')` — ラベル付きフォーム
3. `getByText('...')` — テキスト要素
4. `getByTestId('...')` — 上記で特定できない場合のみ

**クリックパターン**:

```typescript
// ✅ ナビゲーションを伴わない操作（バリデーション・リスト操作）
page.getByRole('button', { name: '追加' }).element().click();
flushSync();
expect(...); // 同期アサーション

// ✅ 非同期アサーション（ポーリングで待機）
page.getByRole('button', { name: '保存' }).element().click();
flushSync();
await expect.element(page.getByRole('alert')).toBeVisible();
```

**マッチャーの使い分け**（Svelte `{#if}` の挙動に合わせる）:

```typescript
// {#if} で DOM から削除される要素
await expect.element(page.getByTestId('error-message')).not.toBeInTheDocument();

// CSS（hidden クラス等）で非表示の要素
await expect.element(page.getByTestId('tooltip')).not.toBeVisible();
```

---

## Step 4: テスト実行

生成完了後に実行して全テストが通ることを確認する。

```bash
# Unit / Component
npm run test:unit -- --run

# Integration
npm run test:integration -- --run
```

失敗したら原因を特定して修正する。`requireAssertions: true` により `expect()` のないテストはエラーになる。
