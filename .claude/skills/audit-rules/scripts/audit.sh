#!/usr/bin/env bash
# ルール準拠チェックスクリプト
# 使用法: bash .claude/skills/audit-rules/scripts/audit.sh [src_root]
# src_root のデフォルトは ./src

SRC="${1:-./src}"
PASS=0
FAIL=0

section() { echo ""; echo "=== $1 ==="; }
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }
list() { echo "    $1"; }

# ──────────────────────────────────────────────
# [file-headers.md] ファイルヘッダー
# ──────────────────────────────────────────────
section "file-headers.md: ファイルヘッダー"

# routes 配下の .ts ファイル（テスト除く）でヘッダーなし
NO_TS_HEADER=$(find "$SRC/routes" -name "*.ts" ! -name "*.test.ts" ! -name "*.integration.test.ts" \
  -exec sh -c 'head -1 "$1" | grep -qE "^/\*\*" || echo "$1"' _ {} \; 2>/dev/null)
if [ -z "$NO_TS_HEADER" ]; then
  ok "routes/*.ts 全ファイルにヘッダーあり"
else
  COUNT=$(echo "$NO_TS_HEADER" | wc -l | tr -d ' ')
  fail "routes/*.ts ヘッダーなし: ${COUNT}件"
  echo "$NO_TS_HEADER" | while IFS= read -r f; do list "$f"; done
fi

# routes 配下の .svelte でヘッダーなし
NO_SVELTE_HEADER=$(find "$SRC/routes" -name "*.svelte" \
  -exec sh -c 'head -1 "$1" | grep -qE "^<!--" || echo "$1"' _ {} \; 2>/dev/null)
if [ -z "$NO_SVELTE_HEADER" ]; then
  ok "routes/*.svelte 全ファイルにヘッダーあり"
else
  COUNT=$(echo "$NO_SVELTE_HEADER" | wc -l | tr -d ' ')
  fail "routes/*.svelte ヘッダーなし: ${COUNT}件"
  echo "$NO_SVELTE_HEADER" | while IFS= read -r f; do list "$f"; done
fi

# +server.ts に @endpoints がない
NO_ENDPOINTS=$(find "$SRC/routes" -name "+server.ts" \
  -exec sh -c 'grep -qL "@endpoints" "$1" && echo "$1"' _ {} \; 2>/dev/null)
NO_ENDPOINTS=$(find "$SRC/routes" -name "+server.ts" | \
  xargs grep -rL "@endpoints" 2>/dev/null)
if [ -z "$NO_ENDPOINTS" ]; then
  ok "+server.ts 全ファイルに @endpoints あり"
else
  COUNT=$(echo "$NO_ENDPOINTS" | wc -l | tr -d ' ')
  fail "+server.ts @endpoints なし: ${COUNT}件"
  echo "$NO_ENDPOINTS" | while IFS= read -r f; do list "$f"; done
fi

# service.ts に @functions がない
NO_FUNCTIONS=$(find "$SRC/routes" -name "service.ts" | \
  xargs grep -rL "@functions" 2>/dev/null)
if [ -z "$NO_FUNCTIONS" ]; then
  ok "service.ts 全ファイルに @functions あり"
else
  COUNT=$(echo "$NO_FUNCTIONS" | wc -l | tr -d ' ')
  fail "service.ts @functions なし: ${COUNT}件"
  echo "$NO_FUNCTIONS" | while IFS= read -r f; do list "$f"; done
fi

# テストファイルに @testType がない
NO_TESTTYPE=$(find "$SRC" -name "*.test.ts" -o -name "*.integration.test.ts" | \
  xargs grep -rL "@testType" 2>/dev/null)
if [ -z "$NO_TESTTYPE" ]; then
  ok "テストファイル全ファイルに @testType あり"
else
  COUNT=$(echo "$NO_TESTTYPE" | wc -l | tr -d ' ')
  fail "テストファイル @testType なし: ${COUNT}件"
  echo "$NO_TESTTYPE" | while IFS= read -r f; do list "$f"; done
fi

# ──────────────────────────────────────────────
# [security.md / svelte.md] {@html} 禁止
# ──────────────────────────────────────────────
section "security.md / svelte.md: {@html} 禁止"

HTML_INJECT=$(grep -rn '{@html}' "$SRC" --include="*.svelte" 2>/dev/null)
if [ -z "$HTML_INJECT" ]; then
  ok "{@html} 使用なし"
else
  COUNT=$(echo "$HTML_INJECT" | wc -l | tr -d ' ')
  fail "{@html} 使用: ${COUNT}箇所"
  echo "$HTML_INJECT" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# [svelte.md] $state(new SvelteSet/Map/URL)
# ──────────────────────────────────────────────
section "svelte.md: SvelteSet/Map を \$state でラップ禁止"

STATE_SVELTE=$(grep -rn '\$state(new Svelte' "$SRC" --include="*.svelte" --include="*.ts" 2>/dev/null)
if [ -z "$STATE_SVELTE" ]; then
  ok "\$state(new SvelteSet/Map) 使用なし"
else
  COUNT=$(echo "$STATE_SVELTE" | wc -l | tr -d ' ')
  fail "\$state(new Svelte...) 使用: ${COUNT}箇所"
  echo "$STATE_SVELTE" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# [api-patterns.md] /api/ プレフィックス禁止
# ──────────────────────────────────────────────
section "api-patterns.md: /api/ プレフィックス禁止"

API_PREFIX=$(find "$SRC/routes" -type d -name "api" 2>/dev/null)
if [ -z "$API_PREFIX" ]; then
  ok "/api/ ディレクトリなし（Better Auth 除く）"
else
  fail "/api/ ディレクトリ存在（意図的なものか確認が必要）:"
  echo "$API_PREFIX" | while IFS= read -r d; do list "$d"; done
fi

# +server.ts に drizzle-orm を直接 import している（service 経由すべき）
DIRECT_DRIZZLE=$(grep -rln "from 'drizzle-orm" "$SRC/routes" --include="+server.ts" 2>/dev/null)
if [ -z "$DIRECT_DRIZZLE" ]; then
  ok "+server.ts に drizzle-orm 直接 import なし"
else
  COUNT=$(echo "$DIRECT_DRIZZLE" | wc -l | tr -d ' ')
  fail "+server.ts に drizzle-orm 直接 import: ${COUNT}件（service.ts 経由すべき）"
  echo "$DIRECT_DRIZZLE" | while IFS= read -r f; do list "$f"; done
fi

# PATCH メソッド使用（schemas.md: PUT のみ使用）
PATCH_USAGE=$(grep -rn "export const PATCH" "$SRC/routes" --include="+server.ts" 2>/dev/null)
if [ -z "$PATCH_USAGE" ]; then
  ok "PATCH メソッド使用なし（PUT のみ）"
else
  COUNT=$(echo "$PATCH_USAGE" | wc -l | tr -d ' ')
  fail "PATCH メソッド使用: ${COUNT}箇所（PUT に統一すべき）"
  echo "$PATCH_USAGE" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# [drizzle.md] nanoid 禁止（crypto.randomUUID() 統一）
# ──────────────────────────────────────────────
section "drizzle.md: ID 生成は crypto.randomUUID() 統一"

NANOID=$(grep -rn "nanoid\|import.*uuid" "$SRC" --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v "randomUUID")
if [ -z "$NANOID" ]; then
  ok "nanoid / 外部 uuid ライブラリ使用なし"
else
  COUNT=$(echo "$NANOID" | wc -l | tr -d ' ')
  fail "nanoid または外部 uuid 使用の可能性: ${COUNT}箇所"
  echo "$NANOID" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# [csr-patterns.md] fetch 後の res.ok チェック
# ──────────────────────────────────────────────
section "csr-patterns.md: fetch 後の res.ok チェック"

# fetch() があるが res.ok チェックがないファイルを探す
FETCH_NO_OK=$(grep -rln "await fetch(" "$SRC/routes" --include="*.svelte" 2>/dev/null | \
  while IFS= read -r f; do
    grep -q "res\.ok\|\.ok)" "$f" || echo "$f"
  done)
if [ -z "$FETCH_NO_OK" ]; then
  ok "fetch() を使う .svelte ファイルはすべて res.ok チェックあり"
else
  COUNT=$(echo "$FETCH_NO_OK" | wc -l | tr -d ' ')
  fail "fetch() はあるが res.ok チェックなし: ${COUNT}件"
  echo "$FETCH_NO_OK" | while IFS= read -r f; do list "$f"; done
fi

# ──────────────────────────────────────────────
# [testing.md] it() → test() 統一
# ──────────────────────────────────────────────
section "testing.md: it() 禁止（test() に統一）"

IT_USAGE=$(grep -rn "^\s*it(" "$SRC" --include="*.test.ts" --include="*.integration.test.ts" 2>/dev/null)
if [ -z "$IT_USAGE" ]; then
  ok "it() 使用なし（test() に統一済み）"
else
  COUNT=$(echo "$IT_USAGE" | wc -l | tr -d ' ')
  fail "it() 使用: ${COUNT}箇所（test() に統一すべき）"
  echo "$IT_USAGE" | while IFS= read -r line; do list "$line"; done
fi

# テスト名が英語のみのもの（日本語を含まないもの）
# 簡易チェック: test(' で始まり ASCII のみのもの
ENG_TESTS=$(grep -rn "test('" "$SRC" --include="*.test.ts" --include="*.integration.test.ts" 2>/dev/null | \
  grep -v '[ぁ-ん]' | grep -v '[ァ-ン]' | grep -v '[一-龥]' | grep -v "TODO\|SKIP" 2>/dev/null | head -20)
if [ -z "$ENG_TESTS" ]; then
  ok "テスト名すべて日本語（サンプル確認）"
else
  COUNT=$(echo "$ENG_TESTS" | wc -l | tr -d ' ')
  fail "テスト名が英語の可能性（サンプル${COUNT}件）:"
  echo "$ENG_TESTS" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# [ui-components.md] data-testid を内部固定禁止
# ──────────────────────────────────────────────
section "ui-components.md: 汎用コンポーネント内 data-testid 固定禁止"

# 汎用UIコンポーネント（Button/Input/Select/Textarea/Dialog/ConfirmDialog）のみ対象
# Header/Sidebar はレイアウト固有コンポーネントのため除外
GENERIC_COMPONENTS="Button.svelte\|Input.svelte\|Select.svelte\|Textarea.svelte\|Dialog.svelte\|ConfirmDialog.svelte"
FIXED_TESTID=$(grep -rn 'data-testid="' "$SRC/lib/components" --include="*.svelte" 2>/dev/null | \
  grep "$GENERIC_COMPONENTS" | grep -v '{...rest}' | grep -v '{\$props}')
if [ -z "$FIXED_TESTID" ]; then
  ok "汎用UIコンポーネント内に data-testid 固定なし"
else
  COUNT=$(echo "$FIXED_TESTID" | wc -l | tr -d ' ')
  fail "汎用UIコンポーネント内に data-testid 固定: ${COUNT}箇所（{...rest} 透過すべき）"
  echo "$FIXED_TESTID" | while IFS= read -r line; do list "$line"; done
fi

# ──────────────────────────────────────────────
# サマリー
# ──────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  静的チェック結果"
echo "  ✓ PASS: ${PASS}  ✗ FAIL: ${FAIL}  合計: $((PASS+FAIL))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
