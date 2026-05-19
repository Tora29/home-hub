variable "account_id" {
  type = string
}

variable "name" {
  type = string
}

variable "d1_id" {
  type = string
}

variable "r2_bucket_name" {
  type = string
}

variable "recipe_images_public_url" {
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
