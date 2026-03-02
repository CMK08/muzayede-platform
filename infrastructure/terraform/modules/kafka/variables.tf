###############################################################################
# MSK (Kafka) Module - Variables
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
  description = "IDs of private subnets for MSK brokers"
  type        = list(string)
}

variable "allowed_security_group_id" {
  description = "Security group ID allowed to connect to MSK (typically EKS node SG)"
  type        = string
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.5.1"
}

variable "number_of_broker_nodes" {
  description = "Number of broker nodes (must be a multiple of AZs used)"
  type        = number
  default     = 3
}

variable "broker_instance_type" {
  description = "Instance type for Kafka brokers"
  type        = string
  default     = "kafka.t3.small"
}

variable "broker_ebs_volume_size" {
  description = "Size of EBS volume per broker in GB"
  type        = number
  default     = 100
}

variable "provisioned_throughput" {
  description = "Provisioned throughput in MiB/s (only for volumes >= 300GB)"
  type        = number
  default     = 250
}

variable "enhanced_monitoring" {
  description = "Enhanced MSK monitoring level"
  type        = string
  default     = "PER_TOPIC_PER_BROKER"

  validation {
    condition     = contains(["DEFAULT", "PER_BROKER", "PER_TOPIC_PER_BROKER", "PER_TOPIC_PER_PARTITION"], var.enhanced_monitoring)
    error_message = "Valid values are DEFAULT, PER_BROKER, PER_TOPIC_PER_BROKER, PER_TOPIC_PER_PARTITION."
  }
}

variable "log_retention_hours" {
  description = "Kafka log retention period in hours"
  type        = number
  default     = 168
}

variable "log_retention_bytes" {
  description = "Kafka log retention size in bytes per partition (-1 for unlimited)"
  type        = number
  default     = -1
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "s3_log_retention_days" {
  description = "S3 broker log retention in days"
  type        = number
  default     = 90
}
