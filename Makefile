ACCOUNT_ID  ?= $(shell grep cloudflare_account_id terraform/terraform.tfvars | cut -d'"' -f2)
R2_ENDPOINT  = https://$(ACCOUNT_ID).r2.cloudflarestorage.com
TF           = terraform -chdir=terraform
TF_VARS      = -var-file=terraform.tfvars
TF_BACKEND   = -backend-config="endpoints={s3=\"$(R2_ENDPOINT)\"}" \
               -backend-config="access_key=$(CLOUDFLARE_R2_ACCESS_KEY_ID)" \
               -backend-config="secret_key=$(CLOUDFLARE_R2_SECRET_ACCESS_KEY)"

.DEFAULT_GOAL := help
.PHONY: help \
        dev tf-dev \
        db-migrate db-migrate-remote db-migrate-all \
        tf-init tf-plan tf-apply tf-validate

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "[Dev]"
	@echo "  dev                開発サーバー起動（Vite・高速）"
	@echo "  tf-dev             開発サーバー起動（Cloudflare Workers 環境・D1/R2/AI 使用可）"
	@echo ""
	@echo "[DB]"
	@echo "  db-migrate         マイグレーション適用（ローカル）"
	@echo "  db-migrate-remote  マイグレーション適用（本番 Cloudflare D1）"
	@echo "  db-migrate-all     マイグレーション適用（ローカル + 本番）"
	@echo ""
	@echo "[Terraform]"
	@echo "  tf-plan            terraform plan（差分確認）"
	@echo "  tf-apply           terraform apply（インフラ反映）"
	@echo "  tf-validate        terraform validate（構文チェック）"
	@echo "  tf-init            terraform init（初回・backend 変更時のみ）"

# ---  Dev  -------------------------------------------------------------------

dev:
	npm run dev

tf-dev:
	npm run dev:cf

# ---  DB  --------------------------------------------------------------------

db-migrate:
	npm run db:migrate:local

db-migrate-remote:
	wrangler d1 migrations apply home-hub --remote

db-migrate-all: db-migrate db-migrate-remote

# ---  Terraform  -------------------------------------------------------------

tf-init:
	$(TF) init -migrate-state $(TF_BACKEND)

tf-plan:
	$(TF) plan $(TF_VARS)

tf-apply:
	$(TF) apply $(TF_VARS)

tf-validate:
	$(TF) validate
