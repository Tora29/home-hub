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
    ignore_changes = [source, build_config]
  }

  deployment_configs {
    production {
      compatibility_date  = "2026-01-01"
      compatibility_flags = ["nodejs_compat"]
      usage_model         = "standard"
      fail_open           = true

      d1_databases = {
        DB = var.d1_id
      }

      r2_buckets = {
        RECIPE_IMAGES = var.r2_bucket_name
      }

      environment_variables = {
        RECIPE_IMAGES_PUBLIC_URL = var.recipe_images_public_url
      }

      secrets = {
        BETTER_AUTH_URL           = var.better_auth_url
        BETTER_AUTH_SECRET        = var.better_auth_secret
        LINE_CHANNEL_ACCESS_TOKEN = var.line_channel_access_token
        LINE_USER_ID_PRIMARY      = var.line_user_id_primary
        LINE_USER_ID_SPOUSE       = var.line_user_id_spouse
      }
    }
  }
}
