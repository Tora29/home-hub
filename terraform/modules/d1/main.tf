terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

resource "cloudflare_d1_database" "this" {
  account_id = var.account_id
  name       = var.name

  # v5 で管理対象になった属性。未指定だと null に更新しようとするため現状値を明示する
  read_replication = {
    mode = "disabled"
  }
}
