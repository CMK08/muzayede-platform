###############################################################################
# MSK (Kafka) Module - Outputs
###############################################################################

output "cluster_arn" {
  description = "ARN of the MSK cluster"
  value       = aws_msk_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the MSK cluster"
  value       = aws_msk_cluster.main.cluster_name
}

output "bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs for the MSK cluster"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "bootstrap_brokers_sasl_scram" {
  description = "SASL/SCRAM connection host:port pairs"
  value       = aws_msk_cluster.main.bootstrap_brokers_sasl_scram
}

output "bootstrap_brokers_sasl_iam" {
  description = "IAM connection host:port pairs"
  value       = aws_msk_cluster.main.bootstrap_brokers_sasl_iam
}

output "zookeeper_connect_string" {
  description = "ZooKeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}

output "zookeeper_connect_string_tls" {
  description = "TLS ZooKeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string_tls
}

output "security_group_id" {
  description = "Security group ID of the MSK cluster"
  value       = aws_security_group.msk.id
}

output "configuration_arn" {
  description = "ARN of the MSK configuration"
  value       = aws_msk_configuration.main.arn
}

output "current_version" {
  description = "Current version of the MSK cluster (for updates)"
  value       = aws_msk_cluster.main.current_version
}
