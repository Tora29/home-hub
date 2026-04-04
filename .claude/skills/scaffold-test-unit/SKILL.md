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
- `/scaffold-contract` が実行済みであり、schema.ts・tables.ts・migrations がコミット済みであること（この HEAD が worktree のベースとなる）

## 起動時の挙動

スキル起動後、以下の順序で必ず実行する。

**1. AskUserQuestion で対象 feature を確認する**

```
question: "どの feature のテストを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

**2. 【他のツール呼び出しより前に】worktree を作成する**

feature が確定したら、ファイルを一切読む前に worktree を作成する。
以降の全ファイル操作はこの worktree ディレクトリで行う。

```bash
git worktree add -b worktree/scaffold-test-unit-{feature} ../home-hub-test-{feature} HEAD
cd ../home-hub-test-{feature}
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

#### 3-2: 期待ファイルリストの作成・存在確認・AC カバレッジ確認

spec.md の「テスト戦略」セクション（または testing.md のファイル命名規則）をもとに、**生成すべきテストファイルの完全なリスト**と**各ファイルがカバーすべき AC リスト**を作成する。

```
期待ファイル例（spec.md のテスト戦略テーブルから抽出）:
- src/routes/{feature}/schema.test.ts            → AC-101〜109, AC-201〜203
- src/routes/{feature}/server.test.ts            → AC-101〜109, AC-106
- src/routes/{feature}/[id]/server.test.ts       → AC-106, AC-113, AC-114
- src/routes/{feature}/page.svelte.test.ts       → AC-016〜020, AC-111〜112
- src/routes/{feature}/service.integration.test.ts → AC-001〜007, AC-013〜015
- e2e/{feature}.e2e.ts                           → AC-204〜205
```

次に **Glob ツールで各ファイルの存在を確認**し、2通りに処理する：

**ファイルが存在しない場合** → Step 4 で新規生成する。

**ファイルが存在する場合** → **必ず Grep で `\[SPEC: AC-\d+\]` を抽出し、期待 AC リストと差分を取る**。

```
カバレッジ確認: Grep('\[SPEC: AC-\d+\]', 対象ファイル)
```

- 抽出した AC 番号と期待 AC リストを比較する
- **不足している AC がある場合 → Step 4 でそのテストケースのみ追記する**
- 全 AC が揃っている場合 → スキップ

> ファイルが存在しても中身が不完全な場合があるため、必ず AC カバレッジを確認すること。

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
- **セレクタ**: `data-testid.md` のセレクタ優先順位に従う（`getByRole` → `getByLabelText` → `getByText` → `getByTestId`）
- **クリック操作**: ナビゲーションを伴わないボタンは `element().click()` + `flushSync()` を使う（`locator.click()` は SvelteKit 環境で 5〜15 秒かかるため）
- **テキスト検証**: `expect.element(page.getByText('....')).toBeVisible()` を使用（`toHaveText` は使わない）
- **非通信確認**: AC に「サーバー非通信」が含まれる場合は `vi.stubGlobal('fetch', vi.fn())` で fetch が呼ばれないことを確認

```typescript
import { describe, test, expect, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { ComponentName } from './{ComponentName}.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('{ComponentName}', () => {
	test('[SPEC: AC-XXX] {振る舞いの説明}', async () => {
		render(
			{ ComponentName },
			{
				/* spec.md から導出した最小限の props */
			}
		);

		// getByRole が使えない場合のみ getByTestId を使う（data-testid.md 参照）
		page.getByRole('button', { name: '{ボタンラベル}' }).element().click();
		flushSync();

		await expect.element(page.getByRole('alert')).toBeVisible();
		await expect.element(page.getByText('{エラーメッセージ}')).toBeVisible();
	});

	test('[SPEC: AC-XXX] サーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(
			{ ComponentName },
			{
				/* props */
			}
		);
		page.getByRole('button', { name: '{ボタンラベル}' }).element().click();
		flushSync();

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
```

### Step 5: チェックリスト検証

以下の項目を順番に確認する。**テスト実行は必ず Bash ツールで行うこと。**

- [ ] **Step 3-2 で作成した期待ファイルリストの全ファイルが存在する**（Glob で確認済み）
- [ ] **既存ファイルを含む全テストファイルで `[SPEC: AC-XXX]` を Grep し、期待 AC との差分がゼロである**（Step 3-2 の AC カバレッジ確認済み）
- [ ] 全ての AC にテストケースが存在する（`[SPEC: AC-XXX]` で紐付け済み）— FE コンポーネントテスト・E2E テストを含む
- [ ] openapi.yaml の全エンドポイントに対するテストが存在する（openapi.yaml がある場合のみ）
- [ ] 正常系・異常系・境界値の各カテゴリをカバーしている
- [ ] テスト命名が testing rule に従っている
- [ ] モック戦略が testing rule に従っている
- [ ] テストファイルの配置が infra-spec.md のディレクトリ構成に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **Bash ツールで `npm run test:unit -- --run` と `npm run test:integration -- --run` を実行し、生成したテストが RED になることを確認した**（実装前のため RED が正常。`Cannot find module` や型エラーで落ちることが期待される）

### Step 6: main へテストファイルを取り込む

worktree で生成したテストファイルを main ブランチに取り込み、履歴管理のためにコミットする。

```bash
# main ブランチに戻る
cd ../home-hub

# worktree のテストファイルのみを取り込む
git checkout worktree/scaffold-test-unit-{feature} -- src/routes/{feature}/
git checkout worktree/scaffold-test-unit-{feature} -- e2e/{feature}.e2e.ts

# worktree を削除
git worktree remove ../home-hub-test-{feature}
git branch -d worktree/scaffold-test-unit-{feature}

# コミット（履歴管理のため。be / fe との依存関係はない）
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
1. /scaffold-be・/scaffold-fe がまだの場合は並列で実行してください。
2. 3つ全て取り込み完了後、`/test-and-fix` を実行して unit + integration を GREEN にしてください。
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

> worktree は scaffold-contract コミット直後の HEAD ベースのため、be / fe / test-unit の成果物は物理的に存在しない。「読まない」ではなく「存在しない」状態で作業する。

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
