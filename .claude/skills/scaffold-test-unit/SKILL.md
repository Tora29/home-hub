---
name: scaffold-test-unit
description: ui-mockup.html の data-* 属性から業務要件を表す Unit / Integration テストを生成する。テストは業務要件の説明文になる。実装を通すためだけのテストは生成しない。
allowed-tools: Read(specs/*), Grep, Glob, Write, Bash(npm run:*)
---

# Unit / API Test Scaffold

ui-mockup.html を主入力として、業務要件テストを生成するスキル。

## 前提条件

- `specs/{feature}/ui-mockup.html` が存在すること
- `specs/infra-spec.md` が存在すること（テストフレームワーク・コマンドの参照）
- `.claude/rules/testing.md` が定義されていること
- `/scaffold-contract` が実行済みで schema.ts・tables.ts がコミット済みであること（worktree のベース）

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
入力読み込み → rules 参照 → data-* マッピング → テスト生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — テストフレームワーク、テストコマンド、ディレクトリ構成
2. `specs/{feature}/ui-mockup.html` — @api コメントと data-\* 属性（テスト生成の唯一の根拠）
3. `src/routes/{feature}/_lib/schema.ts` — 生成済み Zod スキーマ（テストの import 先）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、テスト生成の規約とする:

| rule                            | 参照するもの                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `.claude/rules/testing.md`      | テスト種別、モック戦略、カバレッジ方針、テスト-仕様連携形式 |
| `.claude/rules/file-headers.md` | ファイルヘッダーコメントのテンプレートと記述ルール          |

### Step 3: data-\* からテストケースを導出

ui-mockup.html の各フィールドの data-\* 属性を以下のルールでテストケースに変換する:

| data-\*                | 生成するテストケース                                           | テスト種別     |
| ---------------------- | -------------------------------------------------------------- | -------------- |
| `data-required="true"` | 空文字 → VALIDATION_ERROR（data-error-msg の文言）             | Unit（schema） |
| `data-min="{n}"`       | n-1文字 → VALIDATION_ERROR / n文字 → OK                        | Unit（schema） |
| `data-max="{n}"`       | n文字 → OK / n+1文字 → VALIDATION_ERROR（data-max-msg の文言） | Unit（schema） |
| `data-min-val="{n}"`   | n-1 → VALIDATION_ERROR / n → OK                                | Unit（schema） |
| `data-max-val="{n}"`   | n → OK / n+1 → VALIDATION_ERROR                                | Unit（schema） |
| `data-unique="true"`   | 重複登録 → CONFLICT                                            | Integration    |
| `@api POST`            | 全フィールド正常値 → 正常系登録                                | Integration    |
| `@api GET`             | 登録済みデータ → 一覧に含まれる                                | Integration    |
| `@api DELETE`          | 存在する ID → 削除成功                                         | Integration    |
| `@api PUT`             | 存在する ID + 正常値 → 更新成功                                | Integration    |

#### テスト命名規則

テスト名が業務要件の説明になるように記述する。`[SPEC: AC-XXX]` 形式は使わない。

| ケース    | フォーマット                       | 例                                                             |
| --------- | ---------------------------------- | -------------------------------------------------------------- |
| 正常系    | `{条件}で{操作}できる`             | `正しいデータで料理を登録できる`                               |
| 異常系    | `{条件}の場合、{エラー内容}が返る` | `料理名が空の場合、VALIDATION_ERROR「料理名は必須です」が返る` |
| 境界値 OK | `{条件}の場合、{操作}できる`       | `料理名が100文字の場合、登録できる`                            |
| 境界値 NG | `{条件}の場合、{エラー内容}が返る` | `料理名が101文字の場合、VALIDATION_ERROR が返る`               |

#### 生成しないテスト

以下は生成しない:

- `[SPEC: AC-XXX]` 形式のテスト名
- 関数の内部実装を確認するだけのテスト
- 常に通る自明なテスト（フィールドの存在確認等）

#### ファイル存在確認

Glob で各テストファイルの存在を確認する。存在しない場合は Step 4 で新規生成する。

### Step 4: テスト生成

#### テストケースの命名

テスト名が業務要件の説明になるように記述する。`[SPEC: AC-XXX]` 形式は使わない。

```typescript
// 正常系
test('正しいデータで料理を登録できる', async () => { ... })

// 異常系
test('料理名が空の場合、VALIDATION_ERROR「料理名は必須です」が返る', () => { ... })

// 境界値 OK
test('料理名が100文字の場合、登録できる', () => { ... })

// 境界値 NG
test('料理名が101文字の場合、VALIDATION_ERROR が返る', () => { ... })
```

#### 生成対象

1. **Integration テスト** — @api コメントの各エンドポイントに対する正常系検証（実 D1 使用）
2. **Unit テスト（schema）** — data-\* 属性から導出したバリデーション検証

テストの実行方法・フレームワークは infra-spec.md と testing rule に従う。

#### FE コンポーネントテストの生成パターン

ui-mockup.html の `data-testid` 属性を持つコンポーネントがある場合、以下のパターンで生成する:

- **フレームワーク**: `vitest-browser-svelte`（`render` + `page` from `vitest/browser`）
- **入力**: ui-mockup.html の `data-testid` 属性のみ（実装コードを読まない）
- **セレクタ**: `data-testid.md` のセレクタ優先順位に従う（`getByRole` → `getByLabelText` → `getByText` → `getByTestId`）
- **クリック操作**: ナビゲーションを伴わないボタンは `element().click()` + `flushSync()` を使う（`locator.click()` は SvelteKit 環境で 5〜15 秒かかるため）
- **テキスト検証**: `expect.element(page.getByText('....')).toBeVisible()` を使用（`toHaveText` は使わない）
- **非通信確認**: バリデーションテストは `vi.stubGlobal('fetch', vi.fn())` で fetch が呼ばれないことを確認

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
	test('{フィールド名}が空の場合、エラーメッセージが表示される', async () => {
		render(
			{ ComponentName },
			{
				/* ui-mockup.html から導出した最小限の props */
			}
		);

		// getByRole が使えない場合のみ getByTestId を使う（data-testid.md 参照）
		page.getByRole('button', { name: '{ボタンラベル}' }).element().click();
		flushSync();

		await expect.element(page.getByRole('alert')).toBeVisible();
		await expect.element(page.getByText('{data-error-msg の文言}')).toBeVisible();
	});

	test('バリデーションエラー時、サーバー通信は発生しない', async () => {
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

- [ ] ui-mockup.html の全 data-\* 属性に対応するテストケースが存在する
- [ ] @api コメントの全エンドポイントに対する Integration テストが存在する
- [ ] 正常系・異常系・境界値の各カテゴリをカバーしている
- [ ] テスト名が業務要件の説明文になっている（`[SPEC: AC-XXX]` 形式を使っていない）
- [ ] テスト命名が testing rule に従っている
- [ ] モック戦略が testing rule に従っている
- [ ] テストファイルの配置が infra-spec.md のディレクトリ構成に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **Bash ツールで `npm run test:unit -- --run` と `npm run test:integration -- --run` を実行し、生成したテストが RED になることを確認した**（実装前のため RED が正常。`Cannot find module` や型エラーで落ちることが期待される）

### Step 6: /verify-app を実行する

Skill ツールを使って `/verify-app` を呼び出し、型チェック・Lint・ビルドが全て通ることを確認する。

### Step 7: main へテストファイルを取り込む

worktree で生成したテストファイルを main ブランチに取り込み、履歴管理のためにコミットする。

> **注意**: `git checkout BRANCH -- directory/` はディレクトリ内の実装ファイルも含めて丸ごとチェックアウトしてしまう。
> テストファイルのみを取り込むため、**必ず `find + cp` を使うこと**。

```bash
# 絶対パスを git worktree list から取得（CWD・変数の永続性に依存しない）
MAIN=$(git worktree list | awk 'NR==1{print $1}')
WORKTREE=$(git worktree list | grep "scaffold-test-unit-{feature}" | awk '{print $1}')

# worktree のテストファイルのみを main にコピー（実装ファイルは除外）
find "$WORKTREE/src/routes/{feature}" -type f \( -name "*.test.ts" -o -name "*.integration.test.ts" -o -name "*.svelte.test.ts" \) | while read f; do
  dest="$MAIN/src${f#$WORKTREE/src}"
  mkdir -p "$(dirname "$dest")"
  cp "$f" "$dest"
done

# E2E テストファイルをコピー
[ -f "$WORKTREE/e2e/{feature}.e2e.ts" ] && cp "$WORKTREE/e2e/{feature}.e2e.ts" "$MAIN/e2e/{feature}.e2e.ts"

# worktree を削除
git -C "$MAIN" worktree remove --force "$WORKTREE"
git -C "$MAIN" branch -d worktree/scaffold-test-unit-{feature}

# テストファイルのみをステージ（実装ファイルが混入していないか確認してからコミット）
git -C "$MAIN" status --short  # *.test.ts 系のみであることを確認
git -C "$MAIN" add $(find "$MAIN/src/routes/{feature}" -name "*.test.ts" -o -name "*.integration.test.ts" -o -name "*.svelte.test.ts")
[ -f "$MAIN/e2e/{feature}.e2e.ts" ] && git -C "$MAIN" add "$MAIN/e2e/{feature}.e2e.ts"
git -C "$MAIN" commit -m "test({feature}): unit / integration / e2e テスト生成"
```

- コミットメッセージは Conventional Commits 形式
- `git status` でステージ内容を確認し、実装ファイル（`service.ts`, `+server.ts`, `+page.svelte` 等）が混入していないことを必ず確認してからコミットする

### Step 8: 次のステップ案内

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
