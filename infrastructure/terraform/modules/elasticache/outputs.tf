###############################################################################
# ElastiCache Module - Outputs
###############################################################################

output "replication_group_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.id
}

output "replication_group_arn" {
  description = "ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint_address" {
  description = "Primary endpoint address of the Redis cluster"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint address of the Redis cluster"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "port" {
  description = "Port number of the Redis cluster"
  value       = aws_elasticache_replication_group.main.port
}

output "security_group_id" {
  description = "Security group ID of the Redis cluster"
  value       = aws_security_group.redis.id
}

output "connection_url" {
  description = "Redis connection URL (TLS enabled)"
  value       = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
}
