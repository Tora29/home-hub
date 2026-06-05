---
name: audit-rules
description: >
  プロジェクトのソースコードが .claude/rules のルールに準拠しているかを監査し、
  違反サマリーを出力するスキル。修正は行わない。
  「ルール確認して」「rules に沿ってるか見て」「コード監査して」「audit-rules」
  「実装がルールに合ってるか」「規約チェック」などのリクエストで必ず使用すること。
---

# audit-rules — ルール準拠監査

ソースコードを読まずに修正を提案しない。**違反の検出とサマリー出力のみ**が目的。

## 実行手順

### Step 1: 静的チェック（bash スクリプト）

プロジェクトルートで以下を実行する。

```bash
bash .claude/skills/audit-rules/scripts/audit.sh src
```

スクリプトが検出するルール：

| チェック項目                              | ルールファイル          |
| ----------------------------------------- | ----------------------- |
| `.ts` / `.svelte` のファイルヘッダー有無  | file-headers.md         |
| `+server.ts` に `@endpoints` があるか     | file-headers.md         |
| `service.ts` に `@functions` があるか     | file-headers.md         |
| テストファイルに `@testType` があるか     | file-headers.md         |
| `{@html}` 使用                            | security.md / svelte.md |
| `$state(new SvelteSet/Map)` 使用          | svelte.md               |
| `/api/` ディレクトリ存在                  | api-patterns.md         |
| `+server.ts` への drizzle-orm 直接 import | api-patterns.md         |
| PATCH メソッド使用                        | schemas.md              |
| nanoid / 外部 uuid 使用                   | drizzle.md              |
| fetch 後の `res.ok` チェックなし          | csr-patterns.md         |
| `it()` 使用（`test()` に統一）            | testing.md              |
| テスト名が英語のみ                        | testing.md              |
| `lib/components` 内 data-testid 固定      | ui-components.md        |

スクリプト出力をそのまま記録しておく。

---

### Step 2: 動的チェック（Claude が読む）

静的チェックでは判断できないルールを、**違反率が高そうなファイルに絞ってサンプル確認**する。
全ファイルを読まない。各カテゴリ 2〜3 ファイルをサンプリングすれば十分。

#### 2-1. api-patterns.md: ハンドラの薄さ

`+server.ts` を 2〜3 件読み、以下を確認：

- ハンドラ内に直接 Drizzle クエリが書かれていないか（`db.select()` / `db.insert()` 等）
- バリデーション → service 呼び出し → レスポンス返却 の構造になっているか
- エラー catch で `AppError` を使っているか / 予期しないエラーを `console.error()` しているか

#### 2-2. drizzle.md: JSON カラムの扱い

`service.ts` を 1〜2 件読み、以下を確認：

- JSON カラムを持つテーブルに `parseRow` 関数があるか
- insert/update 時に `JSON.stringify` しているか

#### 2-3. csr-patterns.md: ローディング状態管理

`.svelte` ファイルを 1〜2 件読み、以下を確認：

- `isLoading` フラグが `finally` でリセットされているか
- 操作開始時に `errorMessage = ''` がクリアされているか
- 成功後に `invalidateAll()` が `await` されているか

#### 2-4. testing.md: テスト構造

テストファイルを 1〜2 件読み、以下を確認：

- `describe` + `test()` の組み合わせになっているか
- テスト名が業務要件を表す日本語になっているか

---

### Step 3: サマリー出力

以下のフォーマットで出力する。

```
## ルール準拠監査レポート

### 静的チェック結果
✓ PASS: N  ✗ FAIL: N  合計: N

### 違反サマリー（ルール別）

| ルール | 違反件数 | 概要 |
|---|---|---|
| file-headers.md | 3 | +server.ts 2件ヘッダーなし、service.ts 1件 @functions なし |
| api-patterns.md | 0 | — |
| ... | | |

### 違反詳細

#### file-headers.md（3件）
- `src/routes/foo/+server.ts` — ヘッダーなし
- ...

#### [動的チェック結果]
- `api-patterns.md`: ハンドラ 2件確認 → 違反なし
- `drizzle.md`: parseRow 確認 → src/routes/bar/service.ts でJSON.parse なし（1件）
- ...

### 総評
- 重大度高: N件（セキュリティ・データ整合性に関わる）
- 重大度中: N件（パターン不一致）
- 重大度低: N件（ヘッダー・コメント系）
```

---

## 注意事項

- **修正しない**。提案もしない。検出と報告のみ。
- 動的チェックはサンプリングのため、全違反を保証しない旨を末尾に明記する。
- `src/lib/server/auth.ts` / `db.ts` / `tables.ts` はルール対象外（testing.md 参照）。
- Better Auth の `/api/auth/` ディレクトリは `/api/` プレフィックス禁止の例外。
