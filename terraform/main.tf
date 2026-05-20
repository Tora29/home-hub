terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52"
    }
  }

  backend "s3" {
    bucket = "home-hub-tfstate"
    key    = "terraform.tfstate"
    region = "auto"

    # R2 固有の設定
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true

    # endpoints.s3 は -backend-config で渡す（変数展開が使えないため）
    # terraform init -backend-config="endpoints={s3=\"https://{ACCOUNT_ID}.r2.cloudflarestorage.com\"}"
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "d1" {
  source     = "./modules/d1"
  account_id = var.cloudflare_account_id
  name       = "home-hub"
}

module "r2" {
  source     = "./modules/r2"
  account_id = var.cloudflare_account_id
  name       = "home-hub-recipe-images"
}

module "pages" {
  source         = "./modules/pages"
  account_id     = var.cloudflare_account_id
  name           = "home-hub"
  d1_id          = module.d1.id
  r2_bucket_name = module.r2.name

  recipe_images_public_url  = var.recipe_images_public_url
  better_auth_url           = var.better_auth_url
  better_auth_secret        = var.better_auth_secret
  line_channel_access_token = var.line_channel_access_token
  line_user_id_primary      = var.line_user_id_primary
  line_user_id_spouse       = var.line_user_id_spouse
}
