variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token（Pages + D1 + R2 の Edit 権限が必要）"
  type        = string
  sensitive   = true
}

variable "better_auth_secret" {
  description = "Better Auth のシークレットキー"
  type        = string
  sensitive   = true
}

variable "line_channel_access_token" {
  description = "LINE Messaging API チャンネルアクセストークン"
  type        = string
  sensitive   = true
  default     = ""
}

variable "line_user_id_primary" {
  type      = string
  sensitive = true
  default   = ""
}

variable "line_user_id_spouse" {
  type      = string
  sensitive = true
  default   = ""
}

variable "better_auth_url" {
  description = "Better Auth のベース URL"
  type        = string
  sensitive   = true
}

variable "recipe_images_public_url" {
  description = "R2 RECIPE_IMAGES バケットの公開 URL"
  type        = string
}
