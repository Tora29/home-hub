variable "account_id" {
  type = string
}

variable "name" {
  type = string
}

variable "d1_id" {
  type = string
}

variable "better_auth_url" {
  type      = string
  sensitive = true
}

variable "better_auth_secret" {
  type      = string
  sensitive = true
}

variable "line_channel_access_token" {
  type      = string
  sensitive = true
}

variable "line_user_id_primary" {
  type      = string
  sensitive = true
}

variable "line_user_id_spouse" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "allowed_emails" {
  type      = string
  sensitive = true
}
