# Security

セキュリティ要件と対策方針を定義するカテゴリ。

## このファイルに定義すべきこと

### 認証・認可

- 認証方式（Cookie セッション / JWT / OAuth 等）
- 認可モデル（RBAC / ABAC 等）
- セッション管理の方針

### CSRF / XSS 対策

- CSRF 対策の手段（トークン / SameSite Cookie / JSON 専用 API 等）
- XSS 対策の手段（フレームワーク自動エスケープ / CSP 等）
- Content-Type 制限

### 入力検証

- 入力バリデーションの実施箇所（→ `schemas.md` と連携）
- SQL インジェクション対策（ORM / パラメータ化クエリ）
- ファイルアップロード時のバリデーション

### センシティブデータ

- パスワードのハッシュ化方式
- API キー・シークレットの管理方針
- ログに含めてはいけない情報（→ `error-handling.md` と連携）

### CORS 設定

- 開発環境 / 本番環境の CORS ポリシー
- 許可オリジンの管理方針

### サプライチェーンセキュリティ

- 依存パッケージの管理方針（追加・更新の承認プロセス、許可スコープ）
- lockfile の運用ルール（コミット必須化、差分レビューの方針）
- 依存パッケージの脆弱性監査（監査ツール、実行頻度、CI での自動チェック）
- パッケージ完全性検証（署名検証 / ハッシュ検証 / レジストリ制限 等）

#### 多層防御の実装方針

依存パッケージの追加は「開発時」と「PR レビュー時」の 2 段階で検知する。

| レイヤー | タイミング | 対象 | 仕組み | 設定ファイル |
|---------|-----------|------|--------|-------------|
| L1 | 開発時 | CLI コマンド（`npm add`, `pip install` 等） | hook で**ブロック** → ターミナルで直接実行して回避 | `.claude/hooks/pre-commit-checks.sh` |
| L2 | 開発時 | ファイル編集（`pom.xml`, `build.gradle`, `package.json` 等） | hook で**警告**（systemMessage） → 編集は許可 | `.claude/hooks/pre-commit-checks.sh` |
| L3 | PR 時 | 全依存変更 | `dependency-review-action` が脆弱性・ライセンスをチェック → 違反時マージ阻止 | `.github/workflows/dependency-review.yml` |
| L4 | PR 時 | コードレビュー | review-changes スキルのチェックリストで人間が確認 | `.claude/skills/review-changes/SKILL.md` |

- L1/L2 は速度重視（リアルタイム検知）、L3/L4 は精度重視（脆弱性 DB 照合・人間判断）
- CLI コマンドがない言語（Java/Kotlin/Scala 等）は L2 + L3 + L4 でカバー
- CLI コマンドがある言語も、ファイル直接編集でバイパスされうるため L2 を併用

## なぜ必要か

- scaffold-be スキルがセキュアなコードを生成するための規約
- review-changes スキルがセキュリティ観点でレビューする際の基準
- OWASP Top 10 等のリスクを事前に軽減するため
- サプライチェーン攻撃（依存パッケージ経由の侵害）を予防するため

## 参照するスキル

- scaffold-be, scaffold-fe, review-changes
