#!/bin/bash
# Pre-commit hook: git commit 前に .env 等のセンシティブファイルがステージングされていないかチェックする
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -q 'git commit'; then
  STAGED_ENV=$(git diff --cached --name-only 2>/dev/null | grep -E '\.env$|\.env\.' | grep -v '\.env\.example$' || true)
  if [ -n "$STAGED_ENV" ]; then
    echo "Sensitive files staged for commit:" >&2
    echo "$STAGED_ENV" >&2
    echo "Unstage with 'git reset HEAD <file>' before committing." >&2
    exit 2
  fi
fi

exit 0
