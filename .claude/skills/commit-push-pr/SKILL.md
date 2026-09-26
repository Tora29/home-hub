---
name: commit-push-pr
description: 作業中の変更からブランチ作成・コミット・push・PR作成までを行い、ユーザーがマージして「完了」と伝えたら main に戻してローカルを片付ける。
disable-model-invocation: true
effort: low
---

# commit-push-pr

変更をコミットして PR を作成し、マージ後に後片付けをする。

## 命名規約

このリポジトリの既存履歴に合わせる。

| 対象         | 形式                                                | 例                                                              |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------- |
| ブランチ     | `<type>/<kebab-case の短い説明>`                    | `feat/workout-rest-timer`                                       |
| コミット・PR | `<type>(<scope>): <日本語の内容>`（scope は省略可） | `feat(workout): 筋トレ記録画面に90秒インターバルタイマーを追加` |

- type: `feat` / `fix` / `refactor` / `chore` / `test` / `docs`
- scope: feature ディレクトリ名（`workout` / `expenses` / `dashboard` 等）。複数機能にまたがる場合は省略する

## フェーズ1：PR を作成する

### 1. 現状確認

```bash
git status
git branch --show-current
git diff --stat
git diff
```

- 変更がなければ、その旨を伝えて終了する

### 1-2. gh のアカウント確認

`gh` の操作中アカウントが、リポジトリの所有者と一致しているか確認する。

```bash
gh api user --jq .login
gh repo view --json owner --jq .owner.login
```

- 一致しない場合は以降に進まず、`! gh auth switch --user <所有者>` の実行をユーザーに依頼する
- 切り替え後に再度確認してから進む

### 2. コミットしてよい内容か確認

差分に次のものが含まれていないか確認し、含まれていればコミットせずユーザーに伝える。

- `.env` / `.dev.vars` / `terraform.tfvars`・トークン・API キーなどの秘密情報（`security.md` 参照）
- `test-results/` / `e2e/.auth/` などのテスト生成物（`.gitignore` 対象。強制追加しない）

### 3. ブランチを決める

- **main にいる場合**：差分から type と内容を判断してブランチ名を決め、作成する

  ```bash
  git switch -c <type>/<短い説明>
  ```

- **作業ブランチにいる場合**：そのブランチを使う

差分に無関係な変更が混ざっている場合（例：機能追加と別件の修正）は、PR を分けるかユーザーに確認する。

### 4. コミット

```bash
git add <対象ファイル>
git commit -m "<type>(<scope>): <内容>" -m "<本文（任意）>" -m "Co-Authored-By: ..."
```

- `git add -A` / `git add .` を使わず、対象ファイルを指定する（削除ファイルは `git add <path>` / `git rm` で指定）
- 本文には変更の要点を 1〜3 行で書く
- 末尾の attribution 行はシステムの指示に従う

### 5. push

```bash
git push -u origin <branch-name>
```

### 6. PR 作成

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

- タイトル：コミットメッセージの 1 行目と同じ形式
- 本文：以下の構成

  ```markdown
  ## Summary

  - 変更点を箇条書き

  ## Test plan

  - [x] 実行して通過したもの（npm run check / lint / test:unit / test:integration / test:e2e / build）
  - [ ] 未実施のもの

  ## 注意（該当する場合のみ）

  - マージ時に自動実行される破壊的操作（D1 マイグレーション・terraform apply 等）
  ```

- main マージで `deploy.yml`（D1 マイグレーション適用 + Pages デプロイ）、`terraform/**` 変更時は `terraform.yml`（apply）が自動実行される。DROP マイグレーションやリソース削除を含む場合は「注意」に必ず書く
- 末尾の attribution 行はシステムの指示に従う

### 7. ユーザーに伝える

- PR の URL
- `terraform/**` を変更した場合は、PR の Terraform Plan を確認するよう伝える
- 「マージしたら『完了』と伝えてください」

## フェーズ2：マージ後の後片付け（ユーザーが「完了」と伝えたとき）

### 1. マージを確認する

フェーズ1の「1-2. gh のアカウント確認」と同じ確認を先に行う。

```bash
gh pr view <branch-name> --json number,state,mergedAt,url
```

- `state` が `MERGED` でなければ、その旨を伝えて何もしない

### 2. main に戻して片付ける

```bash
git switch main
git pull --ff-only
git branch -D <branch-name>
git fetch --prune
```

- squash マージの場合は作業ブランチのコミットが main に含まれず `git branch -d` が失敗するため、手順1でマージ済みを確認したうえで `-D` で削除する
- このリポジトリは「Automatically delete head branches」が無効のため、リモートの作業ブランチも削除する

  ```bash
  git push origin --delete <branch-name>
  ```

### 3. 結果を伝える

- main が最新になったこと、削除したブランチ名
- main マージで起動した GitHub Actions（Deploy / Terraform）の結果確認を促す

  ```bash
  gh run list --branch main --limit 5
  ```

## 注意

- main へ直接 push しない
- `--force` / `--no-verify` を使わない
- `gh` にログインしていない場合は、`! gh auth login` の実行をユーザーに依頼する
- `gh` の操作中アカウントを自分で切り替えない（切り替えはユーザーが行う）
