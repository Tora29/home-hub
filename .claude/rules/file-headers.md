# File Headers

ソースコードから設計書をリバースエンジニアリングするインデックスとして、
各ファイル先頭に構造化されたコメントを付与する規約。

scaffold-be / scaffold-fe / scaffold-test-unit / scaffold-test-e2e スキルが
コードを生成する際、**全ファイルにヘッダーコメントを付与すること**。

---

## コメント記法

| ファイル種別 | 記法           |
| ------------ | -------------- |
| `.ts`        | `/** ... */`   |
| `.svelte`    | `<!-- ... -->` |

---

## 共通タグ

| タグ           | 必須 | 説明                                                                                         |
| -------------- | ---- | -------------------------------------------------------------------------------------------- |
| `@file`        | ◯    | 種別と名称（例: `画面: タスク一覧`、`API: タスク`）                                          |
| `@module`      | ◯    | `infra-spec.md` で定義されたディレクトリ構成に基づくフルパス                                 |
| `@feature`     | ◯    | 機能名（`specs/` 配下の feature ディレクトリ名、ネストしない）。共通ライブラリ配下では省略可 |
| `@description` | ◯    | 1〜3行の概要説明                                                                             |
| `@spec`        | △    | `specs/{feature}/ui-mockup.html` への相対パス。共通ライブラリ配下では省略可                  |

---

## ファイル種別ごとのテンプレート

---

### 画面（`+page.svelte`）

```
<!--
  @file 画面: {機能名}
  @module src/routes/{feature}/+page.svelte
  @feature {feature}

  @description
  {画面の概要説明}

  @spec specs/{feature}/ui-mockup.html

  @navigation
  - 遷移元: {パス} - {説明}
  - 遷移先: {パス} - {説明}

  @api
  - GET /{feature} → 200 {Entity}[] - 一覧取得
  - POST /{feature} → 201 {Entity} - 新規作成
-->
```

---

### SSR データ取得（`+page.server.ts`）

```
/**
 * @file データ取得: {機能名}
 * @module src/routes/{feature}/+page.server.ts
 * @feature {feature}
 *
 * @description
 * {機能}画面の初期データをサーバーサイドで取得する。
 *
 * @spec specs/{feature}/ui-mockup.html
 */
```

---

### API ルート（`+server.ts`）

```
/**
 * @file API: {機能名}
 * @module src/routes/{feature}/+server.ts
 * @feature {feature}
 *
 * @description
 * {API の概要説明}
 *
 * @spec specs/{feature}/ui-mockup.html
 *
 * @endpoints
 * - GET /{feature} → 200 {Entity}[] - 一覧取得
 * - POST /{feature} → 201 {Entity} - 新規作成
 *   @body {entity}CreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service ./service.ts
 * @schema ./schema.ts
 */
```

#### `@endpoints` 拡張記法

```
- {METHOD} {path} → {status} {ResponseType} - {説明}
  @body {schemaName}
  @query {param}:{type}={default}(enum1|enum2) ...
  @errors {status}({ErrorCode}) ...
```

---

### サービス層（`service.ts`）

```
/**
 * @file サービス: {Entity}
 * @module src/routes/{feature}/service.ts
 * @feature {feature}
 *
 * @description
 * {サービスの概要説明}
 *
 * @spec specs/{feature}/ui-mockup.html
 *
 * @entity {Entity}
 *
 * @functions
 * - get{Entities}    - 一覧取得
 * - get{Entity}ById  - ID 指定取得
 * - create{Entity}   - 新規作成
 * - update{Entity}   - 更新
 * - delete{Entity}   - 削除
 *
 * @test ./service.integration.test.ts
 */
```

---

### スキーマ（`schema.ts`）

```
/**
 * @file スキーマ: {Entity}
 * @module src/routes/{feature}/schema.ts
 * @feature {feature}
 *
 * @description
 * {スキーマの概要説明}
 *
 * @spec specs/{feature}/ui-mockup.html
 *
 * @schemas
 * - {entity}CreateSchema - 作成用入力
 * - {entity}UpdateSchema - 更新用入力
 *
 * @types
 * - {Entity}Create - 作成用入力型
 * - {Entity}Update - 更新用入力型
 */
```

---

### UI コンポーネント（`{ComponentName}.svelte`）

```
<!--
  @file コンポーネント: {ComponentName}
  @module src/routes/{feature}/components/{ComponentName}.svelte
  @feature {feature}

  @description
  {コンポーネントの概要説明}

  @props
  - {propName}: {型} - {説明}
-->
```

共有コンポーネント（`src/lib/components/`）は `@feature` を省略する。

---

### 共通ユーティリティ（`src/lib/`）

```
/**
 * @file ヘルパー: {名称}
 * @module src/lib/{ファイル名}
 *
 * @description
 * {概要説明}
 */
```

---

### ユニットテスト（`*.test.ts`）

```
/**
 * @file テスト: {対象}
 * @module src/routes/{feature}/{ファイル名}.test.ts
 * @testType unit
 *
 * @target ./{ファイル名}.ts
 * @spec specs/{feature}/ui-mockup.html
 */
```

---

### インテグレーションテスト（`*.integration.test.ts`）

```
/**
 * @file テスト: {対象}
 * @module src/routes/{feature}/{ファイル名}.integration.test.ts
 * @testType integration
 *
 * @target ./{ファイル名}.ts
 * @spec specs/{feature}/ui-mockup.html
 */
```

---

### E2E テスト（`e2e/{feature}.e2e.ts`）

```
/**
 * @file E2Eテスト: {シナリオ名}
 * @module e2e/{feature}.e2e.ts
 * @testType e2e
 *
 * @spec specs/{feature}/ui-mockup.html
 *
 * @scenarios
 * - {シナリオ1の説明}
 * - {シナリオ2の説明}
 *
 * @pages
 * - /{feature} - {画面名}
 */
```

---

## 関数コメント

ファイルヘッダーに加え、**`service.ts` と `+server.ts` の公開関数・ハンドラーには関数コメントを付与する**。

### `service.ts` 関数コメント

```typescript
/**
 * {処理の概要}。
 * @throws {ErrorCode} - {条件}
 */
export async function get{Entities}(db: DrizzleD1Database, userId: string): Promise<{Entity}[]>
```

- `@throws` はエラーを投げる可能性がある場合のみ記述する

### `+server.ts` ハンドラーコメント

```typescript
/**
 * {処理の概要}。
 * @calls {serviceFunction}
 */
export const GET: RequestHandler = async ({ locals, platform }) => {

/**
 * {処理の概要}。{schema} で入力値を検証後、service に委譲する。
 * @body {schema}
 * @throws {ErrorCode} - {条件}
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
```

- ファイルヘッダーの `@endpoints` が全体概観、ハンドラーコメントが処理の意図・エラーパターンを担う

---

## なぜ必要か

- 生成コードから仕様（ui-mockup.html）へのトレーサビリティを確保する
- コードレビュー時に設計意図・仕様参照先を即座に把握できるようにする

## 参照するスキル

- scaffold-be, scaffold-fe, scaffold-test-unit, scaffold-test-e2e, review-changes
