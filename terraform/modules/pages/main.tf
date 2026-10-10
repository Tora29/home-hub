terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name              = var.name
  production_branch = "main"

  lifecycle {
    ignore_changes = [
      source,
      build_config,
      # AI binding と wrangler_config_hash は wrangler.toml（wrangler pages deploy）が管理する。
      # v5 は設定に無い binding を削除しにいくため、Terraform からは触らない
      deployment_configs.production.ai_bindings,
      deployment_configs.production.wrangler_config_hash,
    ]
  }

  deployment_configs = {
    production = {
      compatibility_date  = "2026-01-01"
      compatibility_flags = ["nodejs_compat"]
      usage_model         = "standard"
      fail_open           = true

      d1_databases = {
        DB = { id = var.d1_id }
      }

      # v5 では secrets が env_vars に統合され、type = "secret_text" で暗号化された secret として登録される
      env_vars = {
        BETTER_AUTH_URL           = { type = "secret_text", value = var.better_auth_url }
        BETTER_AUTH_SECRET        = { type = "secret_text", value = var.better_auth_secret }
        LINE_CHANNEL_ACCESS_TOKEN = { type = "secret_text", value = var.line_channel_access_token }
        LINE_USER_ID_PRIMARY      = { type = "secret_text", value = var.line_user_id_primary }
        LINE_USER_ID_SPOUSE       = { type = "secret_text", value = var.line_user_id_spouse }
        GOOGLE_CLIENT_ID          = { type = "secret_text", value = var.google_client_id }
        GOOGLE_CLIENT_SECRET      = { type = "secret_text", value = var.google_client_secret }
        ALLOWED_EMAILS            = { type = "secret_text", value = var.allowed_emails }
      }
    }
  }
}
