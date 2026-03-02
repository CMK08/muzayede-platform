###############################################################################
# Root Module Variables - Muzayede Platform
###############################################################################

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------

variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "muzayede"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway (cost saving for non-prod)"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "flow_log_retention_days" {
  description = "Number of days to retain VPC flow logs"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# EKS
# -----------------------------------------------------------------------------

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "eks_cluster_endpoint_public_access" {
  description = "Whether the EKS cluster API endpoint is publicly accessible"
  type        = bool
  default     = true
}

variable "eks_cluster_log_retention_days" {
  description = "Number of days to retain EKS cluster logs"
  type        = number
  default     = 30
}

variable "eks_node_groups" {
  description = "Map of EKS managed node group configurations"
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size       = number
    max_size       = number
    capacity_type  = optional(string, "ON_DEMAND")
    disk_size      = optional(number, 50)
    labels         = optional(map(string), {})
    taints = optional(list(object({
      key    = string
      value  = optional(string)
      effect = string
    })), [])
  }))
  default = {
    general = {
      instance_types = ["t3.medium"]
      desired_size   = 2
      min_size       = 1
      max_size       = 4
    }
  }
}

# -----------------------------------------------------------------------------
# RDS
# -----------------------------------------------------------------------------

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "rds_database_name" {
  description = "Name of the default database"
  type        = string
  default     = "muzayede"
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = true
}

variable "rds_performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "rds_performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

variable "rds_enhanced_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0 to disable)"
  type        = number
  default     = 60
}

variable "rds_create_read_replica" {
  description = "Create a read replica"
  type        = bool
  default     = false
}

variable "rds_replica_instance_class" {
  description = "Instance class for the read replica"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# ElastiCache Redis
# -----------------------------------------------------------------------------

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the replication group"
  type        = number
  default     = 2
}

variable "redis_multi_az_enabled" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = true
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

# -----------------------------------------------------------------------------
# S3 + CloudFront
# -----------------------------------------------------------------------------

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "cdn_domain_names" {
  description = "Domain names for CloudFront aliases"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront HTTPS (must be in us-east-1)"
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for S3"
  type        = list(string)
  default     = ["*"]
}

variable "spa_mode" {
  description = "Enable SPA mode for CloudFront"
  type        = bool
  default     = true
}

variable "cloudfront_log_retention_days" {
  description = "Number of days to retain CloudFront access logs"
  type        = number
  default     = 90
}

# -----------------------------------------------------------------------------
# OpenSearch
# -----------------------------------------------------------------------------

variable "opensearch_engine_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "opensearch_instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "t3.medium.search"
}

variable "opensearch_instance_count" {
  description = "Number of OpenSearch instances"
  type        = number
  default     = 2
}

variable "opensearch_dedicated_master_enabled" {
  description = "Enable dedicated master nodes"
  type        = bool
  default     = false
}

variable "opensearch_dedicated_master_type" {
  description = "Instance type for dedicated master nodes"
  type        = string
  default     = "t3.medium.search"
}

variable "opensearch_dedicated_master_count" {
  description = "Number of dedicated master nodes"
  type        = number
  default     = 3
}

variable "opensearch_ebs_volume_size" {
  description = "EBS volume size per OpenSearch data node in GB"
  type        = number
  default     = 20
}

variable "opensearch_master_password" {
  description = "Master password for OpenSearch"
  type        = string
  sensitive   = true
}

variable "opensearch_create_service_linked_role" {
  description = "Create the OpenSearch service-linked role (only needed once per account)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# MSK (Kafka)
# -----------------------------------------------------------------------------

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.5.1"
}

variable "kafka_number_of_broker_nodes" {
  description = "Number of Kafka broker nodes"
  type        = number
  default     = 3
}

variable "kafka_broker_instance_type" {
  description = "Instance type for Kafka brokers"
  type        = string
  default     = "kafka.t3.small"
}

variable "kafka_broker_ebs_volume_size" {
  description = "EBS volume size per broker in GB"
  type        = number
  default     = 100
}

variable "kafka_enhanced_monitoring" {
  description = "Enhanced MSK monitoring level"
  type        = string
  default     = "PER_TOPIC_PER_BROKER"
}

variable "kafka_log_retention_hours" {
  description = "Kafka log retention period in hours"
  type        = number
  default     = 168
}
