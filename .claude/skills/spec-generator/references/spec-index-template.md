# 分割 spec インデックステンプレート

複数ドメインを持つ feature 用のインデックスファイルテンプレート。
各ドメインファイル（`task.md` 等）は `spec-template.md` と同じ構造（Schema, API, AC, UI）を持つ。
ただし NFR はインデックスに集約するため、ドメインファイルには含めない。

## テンプレート構造

```markdown
# Feature: {Feature Name}

## Overview

{機能全体の概要を2-3文で記述}

## Sub-Domains

| Domain | File      | Description        |
| ------ | --------- | ------------------ |
| Task   | task.md   | タスクの CRUD 操作 |
| Member | member.md | メンバーの管理     |

## User Stories (Optional)

{ドメイン横断のユーザーストーリー}

## Domain Dependencies (Optional)

{ドメイン間の依存関係。例: Task は Category に依存（categoryId FK）}

## Non-Functional Requirements

### Performance

- {要件}

### Security

- {要件}

### Accessibility

- {要件}
```

---

## 各ドメインファイルの構造

各ドメインファイルは `spec-template.md` に準拠するが、以下の違いがある:

| セクション                  | インデックス | ドメインファイル |
| --------------------------- | ------------ | ---------------- |
| Overview                    | 機能全体     | ドメイン固有     |
| User Stories                | 横断的       | ドメイン固有     |
| Schema                      | -            | ドメイン固有     |
| API Endpoints               | -            | ドメイン固有     |
| Acceptance Criteria         | -            | ドメイン固有     |
| UI Requirements             | -            | ドメイン固有     |
| Non-Functional Requirements | 集約         | -（省略）        |

### AC 番号の採番

- ドメインファイル内で AC-001 から独立採番
- テスト参照にドメインプレフィックスを付与: `[SPEC: task/AC-001]`
- ファイルヘッダーの `@covers` タグも同形式: `@covers task/AC-001, task/AC-002`
