---
name: commit-push-pr
description: Git ワークフロー（コミット、main へ直接プッシュ）を自動化する。
---

# Git ワークフロー自動化

変更をコミットし、main ブランチへ直接プッシュするまでを自動化する。

## 前提条件（推奨）

- `/verify-app` が完了していること（検証通過済み）

## ワークフロー

### 1. 現状確認

```bash
git status
git diff --stat
```

### 2. コミット

Conventional Commits 形式でコミットメッセージを生成:

- `feat(scope): 新機能の説明`
- `fix(scope): バグ修正の説明`
- `refactor(scope): リファクタリングの説明`
- `docs(scope): ドキュメント更新`
- `test(scope): テスト追加・修正`
- `chore(scope): その他の変更`

日本語で説明を記載すること。

### 3. main へ直接プッシュ

```bash
git push origin main
```

## 注意事項

- コミット前に `git diff` で変更内容を確認
- 機密情報（.env、credentials等）がないか確認
