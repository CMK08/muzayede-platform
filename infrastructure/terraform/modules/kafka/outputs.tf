###############################################################################
# MSK Module — Outputs
###############################################################################

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.this.arn
}

output "cluster_name" {
  description = "MSK cluster name"
  value       = aws_msk_cluster.this.cluster_name
}

output "bootstrap_brokers" {
  description = "Plaintext bootstrap broker connection string"
  value       = aws_msk_cluster.this.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "TLS bootstrap broker connection string"
  value       = aws_msk_cluster.this.bootstrap_brokers_tls
}

output "bootstrap_brokers_sasl_iam" {
  description = "IAM bootstrap broker connection string"
  value       = aws_msk_cluster.this.bootstrap_brokers_sasl_iam
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.this.zookeeper_connect_string
}

output "security_group_id" {
  description = "Security group ID for the MSK cluster"
  value       = aws_security_group.msk.id
}

output "configuration_arn" {
  description = "MSK configuration ARN"
  value       = aws_msk_configuration.this.arn
}
