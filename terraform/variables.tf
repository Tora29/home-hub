variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token（Pages + D1 の Edit 権限が必要）"
  type        = string
  sensitive   = true
}

variable "better_auth_secret" {
  description = "Better Auth のシークレットキー"
  type        = string
  sensitive   = true

  # 空値だとセッション署名が成立しないため、Secret 未登録（空文字）での apply を拒否する
  validation {
    condition     = length(var.better_auth_secret) > 0
    error_message = "better_auth_secret が空です。GitHub Secrets の TF_VAR_BETTER_AUTH_SECRET を確認してください。"
  }
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

# GitHub Actions で Secret 未登録の場合 TF_VAR_* は空文字になるため、空値で apply しないよう検証する
variable "google_client_id" {
  description = "Google OAuth クライアント ID"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.google_client_id) > 0
    error_message = "google_client_id が空です。GitHub Secrets の TF_VAR_GOOGLE_CLIENT_ID を確認してください。"
  }
}

variable "google_client_secret" {
  description = "Google OAuth クライアントシークレット"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.google_client_secret) > 0
    error_message = "google_client_secret が空です。GitHub Secrets の TF_VAR_GOOGLE_CLIENT_SECRET を確認してください。"
  }
}

variable "allowed_emails" {
  description = "サインアップを許可するメールアドレス（カンマ区切り）。空だと全員拒否になる"
  type        = string
  sensitive   = true

  validation {
    condition     = length(trimspace(var.allowed_emails)) > 0
    error_message = "allowed_emails が空です。GitHub Secrets の TF_VAR_ALLOWED_EMAILS を確認してください。"
  }
}
