# spec.md テンプレート

## 完全なテンプレート構造

```markdown
# Feature: {Feature Name}

## Overview

{機能の概要を1-2文で簡潔に記述}

## User Stories (Optional)

{ユーザーストーリー形式で要件を記述。省略可。}

- {role}として、{action}したい。{benefit}のため。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

## Acceptance Criteria

{テスト可能な受入条件をリスト形式で記述}

### 正常系

- AC-001: {期待結果の簡潔な説明}
- AC-002: ...

### 異常系

- AC-101: {エラーケースの簡潔な説明}
- AC-102: ...

### 境界値

- AC-201: {境界値ケースの簡潔な説明}
- AC-202: ...

## UI Requirements

{画面の構成要素と振る舞いを記述}

### 画面構成

- {コンポーネント名}: {役割}

### インタラクション

- {操作}: {結果}

### バリデーション表示

- {フィールド名}: {エラー時の表示}

## Non-Functional Requirements

{性能、セキュリティ、アクセシビリティ等の非機能要件}

### Performance

- {要件}

### Security

- {要件}

### Accessibility

- {要件}
```
