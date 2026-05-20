output "d1_database_id" {
  value       = module.d1.id
  description = "wrangler.toml の database_id に反映する"
}

output "r2_bucket_name" {
  value       = module.r2.name
  description = "wrangler.toml の r2_buckets に反映する"
}
