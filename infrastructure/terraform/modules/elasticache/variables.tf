###############################################################################
# ElastiCache Module - Variables
###############################################################################

variable "project" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets for Redis"
  type        = list(string)
}

variable "allowed_security_group_id" {
  description = "Security group ID allowed to connect to Redis (typically EKS node SG)"
  type        = string
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes) in the replication group"
  type        = number
  default     = 2
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ for the replication group"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots (0 to disable)"
  type        = number
  default     = 7
}

variable "maxmemory_policy" {
  description = "Redis maxmemory eviction policy"
  type        = string
  default     = "allkeys-lru"
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for ElastiCache notifications (optional)"
  type        = string
  default     = null
}
