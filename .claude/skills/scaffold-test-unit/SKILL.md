---
name: scaffold-test-unit
description: openapi.yaml と AC を参照して API / Unit テストを生成する。
allowed-tools: Read(specs/*), Grep, Glob, Write, Bash(npm run:*)
---

# Unit / API Test Scaffold

openapi.yaml を主入力として、API テスト・ユニットテストを生成するスキル。

## 前提条件

- `specs/{feature}/spec.md` が存在すること（AC の参照）
- `specs/infra-spec.md` が存在すること（テストフレームワーク・コマンドの参照）
- `.claude/rules/testing.md` が定義されていること
- `specs/{feature}/openapi.yaml` が存在すること（API 要件がある場合のみ。ない場合は spec.md の AC のみを入力とする）
- 既存テストファイルがある場合はそのまま活用し、不足分のみ生成する

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature のテストを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → rules 参照 → AC マッピング → テスト生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — テストフレームワーク、テストコマンド、ディレクトリ構成
2. `specs/{feature}/openapi.yaml` — API エンドポイント、リクエスト/レスポンス型、ステータスコード
3. `specs/{feature}/spec.md` — AC（受入条件）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、テスト生成の規約とする:

| rule                            | 参照するもの                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `.claude/rules/testing.md`      | テスト種別、モック戦略、カバレッジ方針、テスト-仕様連携形式 |
| `.claude/rules/file-headers.md` | ファイルヘッダーコメントのテンプレートと記述ルール          |

### Step 3: AC マッピングとファイル存在確認

#### 3-1: AC マッピング

spec.md の AC を分類し、テストケースにマッピングする:

| AC 種別            | テスト種別                         | 例                         |
| ------------------ | ---------------------------------- | -------------------------- |
| 正常系（AC-001〜） | API テスト: 成功レスポンスの検証   | GET → 200、POST → 201      |
| 異常系（AC-101〜） | API テスト: エラーレスポンスの検証 | バリデーションエラー → 400 |
| 境界値（AC-201〜） | Unit テスト / API テスト           | 最大長、空文字、特殊文字   |

#### 3-2: 期待ファイルリストの作成と存在確認

spec.md の「テスト戦略」セクション（または testing.md のファイル命名規則）をもとに、**生成すべきテストファイルの完全なリスト**を作成する。

```
期待ファイル例（spec.md のテスト戦略テーブルから抽出）:
- src/routes/{feature}/schema.test.ts
- src/routes/{feature}/server.test.ts
- src/routes/{feature}/[id]/server.test.ts
- src/routes/{feature}/page.svelte.test.ts       ← FE コンポーネントテスト
- src/routes/{feature}/service.integration.test.ts
- e2e/{feature}.e2e.ts                           ← E2E テスト
```

次に **Glob ツールで各ファイルの存在を確認**し、存在しないファイルを「生成対象」として特定する。

```
存在確認: Glob('src/routes/{feature}/**/*.test.ts')
存在確認: Glob('e2e/{feature}.e2e.ts')
```

**既存ファイルは読まずにスキップ。不足ファイルのみを Step 4 で生成する。**

### Step 4: テスト生成

#### テストケースの命名

testing rule の命名規約に従う。各テストケースに AC 番号を紐付ける:

```
[SPEC: AC-001] テスト説明
```

分割 SPEC の場合:

```
[SPEC: {domain}/AC-001] テスト説明
```

#### 生成対象

1. **API テスト** — openapi.yaml の各エンドポイントに対するリクエスト/レスポンス検証
2. **スキーマ Unit テスト** — Zod バリデーションロジックの検証
3. **FE コンポーネントテスト** — spec.md のテスト戦略テーブルに `components/` が記載されている場合に生成
4. **E2E テスト** — spec.md のテスト戦略テーブルに `e2e/` が記載されている場合に生成

テストの実行方法・フレームワークは infra-spec.md と testing rule に従う。

#### FE コンポーネントテストの生成パターン

spec.md の**テスト戦略テーブルに `components/*.svelte.test.ts` が記載されている場合**、以下のパターンで生成する:

- **フレームワーク**: `vitest-browser-svelte`（`render` + `page` from `vitest/browser`）
- **入力**: spec.md の `data-testid` テーブル + 対応 AC のみ（実装コードを読まない）
- **セレクタ**: `page.getByTestId(...)` のみ使用（CSS クラス・要素名は使わない）
- **テキスト検証**: `expect.element(page.getByText('....')).toBeVisible()` を使用（`toHaveText` は使わない）
- **非通信確認**: AC に「サーバー非通信」が含まれる場合は `vi.stubGlobal('fetch', vi.fn())` で fetch が呼ばれないことを確認

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { ComponentName } from './{ComponentName}.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('{ComponentName}', () => {
	it('[SPEC: AC-XXX] {振る舞いの説明}', async () => {
		render(
			{ ComponentName },
			{
				/* spec.md から導出した最小限の props */
			}
		);

		await page.getByTestId('{data-testid}').click();

		await expect.element(page.getByTestId('{error-testid}')).toBeVisible();
		await expect.element(page.getByText('{エラーメッセージ}')).toBeVisible();
	});

	it('[SPEC: AC-XXX] サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(
			{ ComponentName },
			{
				/* props */
			}
		);
		await page.getByTestId('{submit-testid}').click();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
```

### Step 5: チェックリスト検証

以下の項目を順番に確認する。**テスト実行は必ず Bash ツールで行うこと。**

- [ ] **Step 3-2 で作成した期待ファイルリストの全ファイルが存在する**（Glob で確認済み）
- [ ] 全ての AC にテストケースが存在する（`[SPEC: AC-XXX]` で紐付け済み）— FE コンポーネントテスト・E2E テストを含む
- [ ] openapi.yaml の全エンドポイントに対するテストが存在する（openapi.yaml がある場合のみ）
- [ ] 正常系・異常系・境界値の各カテゴリをカバーしている
- [ ] テスト命名が testing rule に従っている
- [ ] モック戦略が testing rule に従っている
- [ ] テストファイルの配置が infra-spec.md のディレクトリ構成に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **Bash ツールで `npm run test:unit -- --run` と `npm run test:integration -- --run` を実行し、生成したテストが RED になることを確認した**（実装前のため RED が正常。`Cannot find module` や型エラーで落ちることが期待される）

### Step 6: テストをコミット

scaffold-be / scaffold-fe が worktree のベースとして参照するため、**テスト生成後は必ずコミットする**。

```bash
git add src/routes/{feature}/ e2e/{feature}.e2e.ts
git commit -m "test({feature}): unit / integration / e2e テスト生成"
```

- コミットメッセージは Conventional Commits 形式
- テストファイル以外（実装ファイル等）はこのコミットに含めない

### Step 7: 次のステップ案内

チェックリスト完了後、以下をユーザーに表示する:

```
テスト生成とコミットが完了しました。
次のステップ:
1. `/scaffold-be` を worktree で実行して BE 実装を生成してください。
2. 別ターミナルで `/scaffold-fe` を worktree で実行して FE 実装を生成してください。
3. 両方完了したら `/test-and-fix` を実行してください。
```

## テスト生成の原則

### 仕様からテストを導出する

- テストケースは AC の機械的変換であること
- **実装コードを読んではいけない**。openapi.yaml と spec.md のみを入力とする
- 実装の内部構造に依存しない（ブラックボックステスト）
- テストが仕様を検証する手段であり、実装に合わせて甘くしない

#### 読んではいけないファイル（禁止リスト）

以下は「コーディングパターンの確認」「既存実装の参照」を目的とした読み込みも含め、**一切読んではいけない**:

- `src/routes/**` — 既存機能の実装・スキーマ・テスト（他 feature のものも含む）
- `src/lib/**` — 共通ライブラリ実装
- `vite.config.ts`, `wrangler.toml`, `package.json` — インフラ設定

コーディングパターンが必要な場合は `.claude/rules/` の rules ファイルを参照すること。
テスト記法は `testing.md`、スキーマ記法は `schemas.md`、ファイルヘッダーは `file-headers.md` が正とする。

### AC とテストの紐付け

- 全てのテストケースに `[SPEC: AC-XXX]` を付与
- 1つの AC に対して複数のテストケースを持つことは可
- AC なしのテスト（インフラレベルのテスト等）は `[SPEC: AC-XXX]` なしで可

### テスト堅牢性ガイドライン

生成するテストが「甘いテスト」にならないための指針:

| ガイドライン         | 悪い例                                    | 良い例                                    |
| -------------------- | ----------------------------------------- | ----------------------------------------- |
| 具体的な値をアサート | `expect(res.status).toBeDefined()`        | `expect(res.status).toBe(201)`            |
| リスト件数は具体値   | `expect(items.length).toBeGreaterThan(0)` | `expect(items.length).toBe(3)`            |
| 不正値の拒否も検証   | 正常系のみ                                | 正常系 + 不正値で 400 を確認              |
| フィールド値まで検証 | `expect(body).toHaveProperty('title')`    | `expect(body.title).toBe('テストタスク')` |
| 境界値を網羅         | 中間値のみ                                | 下限-1, 下限, 上限, 上限+1                |

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
