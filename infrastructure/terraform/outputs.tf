###############################################################################
# Root Module Outputs - Muzayede Platform
###############################################################################

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

# -----------------------------------------------------------------------------
# EKS
# -----------------------------------------------------------------------------

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for cluster authentication"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "eks_node_security_group_id" {
  description = "Security group ID of EKS worker nodes"
  value       = module.eks.node_security_group_id
}

# -----------------------------------------------------------------------------
# RDS
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL hostname"
  value       = module.rds.db_instance_address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "Name of the default database"
  value       = module.rds.db_name
}

output "rds_master_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the RDS master password"
  value       = module.rds.db_master_password_secret_arn
}

output "rds_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = module.rds.db_replica_endpoint
}

# -----------------------------------------------------------------------------
# ElastiCache Redis
# -----------------------------------------------------------------------------

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = module.elasticache.reader_endpoint_address
}

output "redis_connection_url" {
  description = "Redis connection URL (TLS)"
  value       = module.elasticache.connection_url
}

# -----------------------------------------------------------------------------
# S3 + CloudFront
# -----------------------------------------------------------------------------

output "s3_bucket_id" {
  description = "ID of the static assets S3 bucket"
  value       = module.s3_cloudfront.s3_bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.s3_cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.s3_cloudfront.cloudfront_domain_name
}

# -----------------------------------------------------------------------------
# OpenSearch
# -----------------------------------------------------------------------------

output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = module.elasticsearch.domain_endpoint
}

output "opensearch_dashboard_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = module.elasticsearch.dashboard_endpoint
}

output "opensearch_connection_url" {
  description = "OpenSearch HTTPS connection URL"
  value       = module.elasticsearch.connection_url
}

# -----------------------------------------------------------------------------
# MSK (Kafka)
# -----------------------------------------------------------------------------

output "kafka_bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs for MSK"
  value       = module.kafka.bootstrap_brokers_tls
}

output "kafka_bootstrap_brokers_sasl_iam" {
  description = "IAM connection host:port pairs for MSK"
  value       = module.kafka.bootstrap_brokers_sasl_iam
}

output "kafka_zookeeper_connect_string" {
  description = "ZooKeeper connection string"
  value       = module.kafka.zookeeper_connect_string
}
