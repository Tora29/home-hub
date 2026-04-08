---
name: commit-push-pr
description: Git ワークフロー（ブランチ作成、コミット、PR 作成、Codex レビュー依頼）を自動化する。
---

# Git ワークフロー自動化

変更をコミットし、作業ブランチへプッシュして PR を作成し、Codex レビューを依頼するまでを自動化する。

## ワークフロー

### 1. 現状確認

```bash
git status
git diff --stat
```

### 2. 作業ブランチ作成

`main` へ直接 push しないこと。変更内容に応じたブランチ名を付けて作業ブランチを作成する。

例:

```bash
git switch -c fix/hogehoge
```

### 3. コミット

Conventional Commits 形式でコミットメッセージを生成:

- `feat(scope): 新機能の説明`
- `fix(scope): バグ修正の説明`
- `refactor(scope): リファクタリングの説明`
- `docs(scope): ドキュメント更新`
- `test(scope): テスト追加・修正`
- `chore(scope): その他の変更`

日本語で説明を記載すること。

### 4. 作業ブランチを push

```bash
git push -u origin <branch-name>
```

### 5. PR 作成

`gh` CLI を使って PR を作成する。base は通常 `main` とする。

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

PR タイトルはコミットメッセージと整合する内容にすること。本文には変更概要と確認内容を簡潔に含めること。

### 6. Codex レビュー依頼

PR 作成後、同じ PR に `@codex review` コメントを付けてレビューを依頼する。

```bash
gh pr comment <pr-number-or-url> --body "@codex review"
```

## 注意事項

- コミット前に `git diff` で変更内容を確認
- 機密情報（.env、credentials等）がないか確認
- `main` への直接 push は行わない
- `gh` CLI で GitHub にログイン済みであることを確認する
- `@codex review` を使うには、GitHub 側で Codex のレビュー機能が利用可能な状態であることを確認する
