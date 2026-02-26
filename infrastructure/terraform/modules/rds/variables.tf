###############################################################################
# RDS Module — Variables
###############################################################################

variable "identifier" {
  description = "RDS instance identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.2"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GiB"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in GiB"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "muzayede"
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "muzayede_admin"
  sensitive   = true
}

variable "master_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID where the RDS will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to the RDS"
  type        = list(string)
  default     = []
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "KMS key ARN for storage encryption"
  type        = string
  default     = null
}

variable "create_read_replica" {
  description = "Create a read replica"
  type        = bool
  default     = false
}

variable "replica_instance_class" {
  description = "Instance class for the read replica"
  type        = string
  default     = "db.r6g.large"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
