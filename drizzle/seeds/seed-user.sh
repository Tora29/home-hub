#!/bin/sh
# テストユーザーシード（ローカル開発用）
# 事前に `npm run dev` でサーバーを起動してから実行する
#
# 使い方:
#   chmod +x drizzle/seeds/seed-user.sh
#   ./drizzle/seeds/seed-user.sh
#
# オプション:
#   BASE_URL=http://localhost:5173 ./drizzle/seeds/seed-user.sh

BASE_URL="${BASE_URL:-http://localhost:5173}"

echo "テストユーザーを作成します: test@example.com"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"name":"テストユーザー","email":"test@example.com","password":"password123"}')

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]; then
  echo "作成完了 (HTTP ${RESPONSE})"
  echo ""
  echo "ログイン情報:"
  echo "  Email   : test@example.com"
  echo "  Password: password123"
elif [ "$RESPONSE" = "422" ]; then
  echo "スキップ: すでに登録済みのユーザーです (HTTP ${RESPONSE})"
else
  echo "エラー: HTTP ${RESPONSE}"
  echo "サーバーが起動しているか確認してください: ${BASE_URL}"
  exit 1
fi
