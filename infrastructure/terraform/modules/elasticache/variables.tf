###############################################################################
# ElastiCache Module — Variables
###############################################################################

variable "cluster_id" {
  description = "ElastiCache replication group ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
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
  default     = "cache.r6g.large"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (non-cluster mode)"
  type        = number
  default     = 2
}

variable "cluster_mode_enabled" {
  description = "Enable cluster mode"
  type        = bool
  default     = true
}

variable "num_node_groups" {
  description = "Number of node groups (shards) for cluster mode"
  type        = number
  default     = 3
}

variable "replicas_per_node_group" {
  description = "Number of replicas per node group"
  type        = number
  default     = 1
}

variable "multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect"
  type        = list(string)
  default     = []
}

variable "transit_encryption_enabled" {
  description = "Enable transit encryption (TLS)"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Auth token for Redis (required when transit encryption is enabled)"
  type        = string
  default     = null
  sensitive   = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for notifications"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
