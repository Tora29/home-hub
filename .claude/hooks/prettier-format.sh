#!/bin/bash
# PostToolUse hook: Edit / Write 後に Prettier を自動適用する

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Edit / Write 以外はスキップ
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

# file_path が取得できない場合はスキップ
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Prettier が対応する拡張子のみ対象
case "$FILE_PATH" in
  *.ts|*.js|*.svelte|*.html|*.css|*.json|*.md|*.yaml|*.yml)
    ;;
  *)
    exit 0
    ;;
esac

# ファイルが存在する場合のみ実行
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# プロジェクトルートから実行（prettier.config があるディレクトリ）
PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null)
if [ -z "$PROJECT_ROOT" ]; then
  exit 0
fi

cd "$PROJECT_ROOT" || exit 0

npx prettier --write "$FILE_PATH" --log-level warn 2>&1

exit 0
