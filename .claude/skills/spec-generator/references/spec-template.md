# spec.md テンプレート

## 完全なテンプレート構造

```markdown
# Feature: {Feature Name}

## Overview

{機能の概要を1-2文で簡潔に記述}

## User Stories (Optional)

{ユーザーストーリー形式で要件を記述。省略可。}

- {role}として、{action}したい。{benefit}のため。

## Schema

{この機能で使用するデータ構造を定義}

### Entity スキーマ

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string (UUID) | 一意識別子 |
| {field} | {type} | {説明} |
| createdAt | string (ISO 8601) | 作成日時 |
| updatedAt | string (ISO 8601) | 更新日時 |

### Create スキーマ（入力）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| {field} | {type} | {説明} |

### Update / Patch スキーマ

PUT（全フィールド必須）と PATCH（全フィールド optional）の使い分けを記述。

> フィールドの必須/任意・制約（max, min, pattern）は openapi.yaml の schema 定義を参照。
> openapi.yaml がない場合は `必須` `制約` カラムも追加する。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/{feature} | {一覧取得の説明} |
| POST | /api/v1/{feature} | {作成の説明} |
| GET | /api/v1/{feature}/{id} | {詳細取得の説明} |
| PATCH | /api/v1/{feature}/{id} | {更新の説明} |
| DELETE | /api/v1/{feature}/{id} | {削除の説明} |

> 型定義・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。
> openapi.yaml がない場合（API レス機能）は Request Body, Response, Success, Error カラムも追加する。

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
