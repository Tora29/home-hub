# Step 3.5: openapi.yaml 生成

ユーザーの入力に API 要件（エンドポイント、データの CRUD 等）が含まれる場合:

1. spec.md の API 要件から OpenAPI 3.0 仕様の YAML を生成
2. `specs/{feature}/openapi.yaml` に出力
3. spec.md 内から openapi.yaml を参照するリンクを追加

API 要件がない場合はこのステップをスキップする。

---

## tags の付与ルール（必須）

生成する openapi.yaml には必ず `tags` を定義し、各 operation に付与する。

- トップレベルに `tags:` セクションを定義する
- エンドポイントのグループ（リソース種別）ごとに tag を作成する
- 命名: kebab-case で feature 名または resource 名を使う（例: `expense`, `expense-categories`, `recipes`）
- 各 operation には `tags: [{tag_name}]` を付与する

```yaml
tags:
  - name: tasks
    description: タスク管理
  - name: task-comments
    description: タスクコメント

paths:
  /tasks:
    get:
      tags: [tasks]
      summary: タスク一覧取得
  /task-comments:
    post:
      tags: [task-comments]
      summary: コメント投稿
```

tags がないと Swagger UI で全エンドポイントが `default` グループに表示されてしまうため必須。

---

## components.responses の標準定義（必須）

複数 feature の openapi.yaml をマージするため、`components.responses` の共通レスポンスは**全 feature で同一内容**にする。

**重要**: テンプレートは `references/openapi-templates.yaml` からコピーし、example を feature 固有の値に**変更しない**こと。

---

## 生成後の処理

### 1. マージ実行

以下を実行してマージ済み `specs/openapi.yaml` を更新する:

```bash
node .claude/skills/spec-generator/scripts/merge-openapi.mjs
```

### 2. Swagger UI 起動

マージ後、以下の docker-compose.yml を `docker compose up` で起動すると Swagger UI で**全機能の**エンドポイントを確認できることをユーザーに伝える:

```yaml
services:
  swagger-ui:
    image: swaggerapi/swagger-ui
    ports:
      - '8080:8080'
    environment:
      SWAGGER_JSON: /specs/openapi.yaml
    volumes:
      - ./specs:/specs:ro
```
