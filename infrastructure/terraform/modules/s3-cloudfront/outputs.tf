###############################################################################
# S3 + CloudFront Module — Outputs
###############################################################################

output "media_bucket_id" {
  description = "Media S3 bucket ID"
  value       = aws_s3_bucket.buckets["media"].id
}

output "media_bucket_arn" {
  description = "Media S3 bucket ARN"
  value       = aws_s3_bucket.buckets["media"].arn
}

output "static_bucket_id" {
  description = "Static S3 bucket ID"
  value       = aws_s3_bucket.buckets["static"].id
}

output "static_bucket_arn" {
  description = "Static S3 bucket ARN"
  value       = aws_s3_bucket.buckets["static"].arn
}

output "backups_bucket_id" {
  description = "Backups S3 bucket ID"
  value       = aws_s3_bucket.buckets["backups"].id
}

output "backups_bucket_arn" {
  description = "Backups S3 bucket ARN"
  value       = aws_s3_bucket.buckets["backups"].arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.this.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.this.arn
}
