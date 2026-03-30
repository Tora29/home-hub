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

| AC 範囲               | 内容                               | テスト種別                  |
| --------------------- | ---------------------------------- | --------------------------- |
| AC-001〜099（正常系） | DB を含む正常動作                  | Integration テスト（実 D1） |
| AC-101〜199（異常系） | バリデーションエラー・権限エラー等 | Zod schema Unit テスト      |
| AC-201〜299（境界値） | 文字数上限・数値範囲等             | Zod schema Unit テスト      |

> バリデーション系の AC を Integration テストで書くと D1 セットアップが毎回走り低速になる。
> Zod schema の Unit テストで代替することで高速・シンプルに保つ。

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
  it('[SPEC: AC-001] 正しいデータは parse できる', () => { ... });
  it('[SPEC: AC-101] name が空の場合は VALIDATION_ERROR になる', () => { ... });
  it('[SPEC: AC-201] name が100文字の場合は parse できる', () => { ... });
});

describe('createDish', () => {
  it('[SPEC: AC-001] 料理を作成できる', async () => { ... });  // Integration
});
```

### テストケース命名規則

- `test()` は使用しない。必ず `describe` + `it` の組み合わせで記述する
- `describe` にはテスト対象の関数名・スキーマ名・コンポーネント名を指定する
- `it` は「〜できる」「〜の場合は〜」の日本語形式

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
