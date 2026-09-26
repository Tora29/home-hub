TF = terraform -chdir=terraform

.DEFAULT_GOAL := help
.PHONY: help \
        dev dev-cf \
        db-migrate db-migrate-remote db-migrate-all \
        tf-check

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "[Dev]"
	@echo "  dev                開発サーバー起動（Vite・高速）"
	@echo "  dev-cf             開発サーバー起動（build + wrangler pages dev・本番同等ランタイム）"
	@echo ""
	@echo "[DB]"
	@echo "  db-migrate         マイグレーション適用（ローカル）"
	@echo "  db-migrate-remote  マイグレーション適用（本番 Cloudflare D1）"
	@echo "  db-migrate-all     マイグレーション適用（ローカル + 本番）"
	@echo ""
	@echo "[Terraform]"
	@echo "  tf-check           terraform fmt / validate（構文チェックのみ・本番の値は不要）"
	@echo ""
	@echo "  plan / apply は GitHub Actions（.github/workflows/terraform.yml）でのみ実行する"
	@echo "  本番の値は GitHub Secrets の TF_VAR_* だけに置く（ローカルに terraform.tfvars を作らない）"

# ---  Dev  -------------------------------------------------------------------

dev:
	npm run dev

dev-cf:
	npm run dev:cf

# ---  DB  --------------------------------------------------------------------

db-migrate:
	npm run db:migrate:local

db-migrate-remote:
	npx wrangler d1 migrations apply home-hub --remote

db-migrate-all: db-migrate db-migrate-remote

# ---  Terraform  -------------------------------------------------------------

tf-check:
	$(TF) fmt -check -recursive
	$(TF) init -backend=false -input=false > /dev/null
	$(TF) validate
