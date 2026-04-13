---
name: scaffold-be
description: openapi.yaml と rules/ を参照してバックエンド実装コードを生成する。
---

# Backend Scaffold

openapi.yaml を主入力として、バックエンド実装コードを生成するスキル。

## 前提条件

- `specs/{feature}/openapi.yaml` が存在すること
- `specs/infra-spec.md` が存在すること（技術スタック・ディレクトリ構成の参照）
- `.claude/rules/` に api-patterns, error-handling, schemas, security が定義されていること
- `/scaffold-contract` が実行済みであり、schema.ts・tables.ts・migrations がコミット済みであること（この HEAD が worktree のベースとなる）

## 起動時の挙動

スキル起動後、以下の順序で必ず実行する。

**1. AskUserQuestion で対象 feature を確認する**

```
question: "どの feature の BE コードを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

**2. 【他のツール呼び出しより前に】worktree を作成する**

feature が確定したら、ファイルを一切読む前に worktree を作成する。
以降の全ファイル操作はこの worktree ディレクトリで行う。

```bash
git worktree add -b worktree/scaffold-be-{feature} ../home-hub-be-{feature} HEAD
cd ../home-hub-be-{feature}
```

## ワークフロー

```
worktree 作成 → 入力読み込み → rules 参照 → コード生成 → チェックリスト検証 → main へ取り込み
```

### Step 0: worktree の作成

worktree の作成は「起動時の挙動」で完了済み。このステップはスキップして Step 1 へ進む。

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — 技術スタック、ディレクトリ構成、パスエイリアス等
2. `specs/{feature}/openapi.yaml` — API エンドポイント、リクエスト/レスポンス型、ステータスコード
3. `specs/{feature}/spec.md` — 以下のセクションを必ず参照する:
   - **Business Rules** — 状態遷移マトリクス、権限モデル、エンティティ間制約、計算ロジック、外部API連携（成功/失敗パターン・トランザクション境界）、境界条件
   - **Acceptance Criteria** — 正常系・異常系・境界値
   - **UI Requirements** — 状態ごとの表示ルール（FE 側の権限制御の参考）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、コード生成の規約とする:

| rule                              | 参照するもの                                          |
| --------------------------------- | ----------------------------------------------------- |
| `.claude/rules/api-patterns.md`   | レスポンス形式、ステータスコード、Controller パターン |
| `.claude/rules/error-handling.md` | エラー分類、Result Pattern、ロギング                  |
| `.claude/rules/schemas.md`        | バリデーション方針、スキーマ配置、FE/BE 役割          |
| `.claude/rules/security.md`       | 認証認可、入力検証、CORS                              |
| `.claude/rules/file-headers.md`   | ファイルヘッダーコメントのテンプレートと記述ルール    |

### Step 3: 既存ファイルの確認

Glob で対象 feature のファイル存在を確認し、生成戦略を決定する:

```
Glob('src/routes/{feature}/**/*.ts')
Glob('src/routes/{feature}/**/*.svelte')
```

| 結果         | 戦略                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| 空（新規）   | Read しない。Step 4 で Write により全量生成する                                                    |
| あり（更新） | 対象 feature の**実装ファイルのみ** Read して現状を把握する。Step 4 で Edit により差分のみ更新する |

**以下のファイルは新規・更新を問わず一切 Read しない:**

- 他 feature のファイル

> worktree は scaffold-contract コミット直後の HEAD ベースのため、be / fe / test-unit の成果物は物理的に存在しない。

### Step 4: コード生成

openapi.yaml のエンドポイント定義に基づき、infra-spec.md のディレクトリ構成に従って以下を生成:

1. **Service 層** — ビジネスロジック + DB 操作（error-handling rule 参照）
2. **Controller / Routes** — HTTP ハンドラ（api-patterns rule 参照）

> schema.ts・tables.ts・マイグレーション SQL は `/scaffold-contract` が生成済みのため、ここでは生成しない。
> worktree の `HEAD~1` ベース（= scaffold-contract のコミット）からこれらのファイルを参照できる。

#### Business Rules の実装マッピング

spec.md の Business Rules セクションを以下のように service.ts に反映する:

| Business Rules     | service.ts での実装箇所  | 具体的な実装                                                       |
| ------------------ | ------------------------ | ------------------------------------------------------------------ |
| 状態遷移マトリクス | 各操作関数の冒頭         | `if (item.status !== 'expected') throw AppError(...)` で遷移ガード |
| 権限マトリクス     | 各操作関数の冒頭         | `if (item.userId !== userId) throw AppError('FORBIDDEN', ...)`     |
| エンティティ間制約 | 作成・更新関数内         | 親エンティティの存在・所有権を先に検証                             |
| 外部API連携        | 通知・外部呼び出し関数内 | トランザクション内でDB更新 → 外部API呼び出し → 失敗時ロールバック  |
| 計算ロジック       | 集計・一覧関数内         | spec の数式をそのまま SQL/コードに変換                             |
| 境界条件           | 各関数の入力検証         | null ガード、存在チェック、不正遷移の AppError                     |

**重要**: Business Rules セクションに定義されたルールは、scaffold-be が推測せずマトリクスを正として実装する。各行を漏れなくコードに反映すること。

生成するファイルの配置場所は infra-spec.md のディレクトリ構成に従う。

### Step 4: チェックリスト検証

生成したコードが以下を満たしているか自己検証:

- [ ] `tables.ts` にテーブル定義が追記されている（既存定義は変更していない）
- [ ] マイグレーション SQL が正しい連番で生成されている
- [ ] openapi.yaml の全エンドポイントが実装されている
- [ ] リクエスト/レスポンス型が openapi.yaml と一致している
- [ ] ステータスコードが openapi.yaml と一致している
- [ ] バリデーションが schemas rule に従っている
- [ ] エラーハンドリングが error-handling rule に従っている
- [ ] セキュリティが security rule に従っている
- [ ] **spec.md の Business Rules が全て実装されている**:
  - 状態遷移マトリクスの全有効遷移・不正遷移がコードに反映されている
  - 権限マトリクスの全操作で権限チェックが実装されている
  - エンティティ間制約の所有権チェックが実装されている
  - 外部API連携の成功/失敗パターン・トランザクション境界が実装されている
  - 計算ロジックが spec の数式通りに実装されている
  - 境界条件の null ガード・存在チェックが実装されている
- [ ] ディレクトリ構成が infra-spec.md に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている

### Step 5: main へ実装ファイルを取り込む

worktree で生成した実装ファイルを main ブランチに取り込む。

> **注意**: `git checkout BRANCH -- directory/` はディレクトリ内のテストファイルも含めて丸ごとチェックアウトしてしまい、他スキルが先にコミットしたテストファイルを上書きする危険がある。
> **必ず `find + cp` でテストファイルを除いた実装ファイルのみをコピーすること。**

```bash
WORKTREE=../home-hub-be-{feature}

# 実装ファイルのみをコピー（テストファイルは除外）
find "$WORKTREE/src/routes/{feature}" \( -name "*.ts" -o -name "*.svelte" \) | \
  grep -v "\.test\.ts$" | grep -v "\.integration\.test\.ts$" | grep -v "\.svelte\.test\.ts$" | \
  while read f; do
    dest="./src${f#$WORKTREE/src}"
    mkdir -p "$(dirname "$dest")"
    cp "$f" "$dest"
  done

# tables.ts・migrations は常に上書き（テストスキャフォールドは触らないため安全）
cp "$WORKTREE/src/lib/server/tables.ts" src/lib/server/tables.ts
cp -r "$WORKTREE/drizzle/migrations/" drizzle/migrations/

# worktree を削除
git worktree remove --force "$WORKTREE"
git branch -d worktree/scaffold-be-{feature}

# 実装ファイルのみをステージ（テストファイルが混入していないか確認してからコミット）
git status --short  # *.test.ts 系が混入していないことを確認
```

### Step 6: 次のステップ案内

チェックリスト完了後、以下をユーザーに表示する:

```
BE 実装が完了しました。
次のステップ:
1. /scaffold-fe・/scaffold-test-unit がまだの場合は並列で実行してください。
2. 3つ全て取り込み完了後、`/test-and-fix` を実行して unit + integration を GREEN にしてください。
```

## 生成ルール

### Controller は薄く保つ

- HTTP ハンドラ、バリデーション、Service 呼び出し、レスポンス返却のみ
- ビジネスロジックは Service 層に委譲

### スキーマは openapi.yaml から導出

- Create / Update / Patch / Response の各スキーマを定義
- schemas rule の命名規則・配置規約に従う

### エラーハンドリング

- error-handling rule で定義されたパターンに従う
- エラーコード体系を統一

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
