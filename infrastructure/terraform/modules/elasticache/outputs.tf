###############################################################################
# ElastiCache Module — Outputs
###############################################################################

output "replication_group_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.this.id
}

output "primary_endpoint_address" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "configuration_endpoint_address" {
  description = "Configuration endpoint address (cluster mode)"
  value       = var.cluster_mode_enabled ? aws_elasticache_replication_group.this.configuration_endpoint_address : null
}

output "port" {
  description = "Redis port"
  value       = 6379
}

output "security_group_id" {
  description = "Security group ID for the ElastiCache cluster"
  value       = aws_security_group.redis.id
}

output "arn" {
  description = "ElastiCache replication group ARN"
  value       = aws_elasticache_replication_group.this.arn
}
