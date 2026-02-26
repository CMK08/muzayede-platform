###############################################################################
# MSK Module — Variables
###############################################################################

variable "cluster_name" {
  description = "MSK cluster name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "kafka_version" {
  description = "Apache Kafka version"
  type        = string
  default     = "3.6.0"
}

variable "number_of_broker_nodes" {
  description = "Number of broker nodes (must be multiple of AZs)"
  type        = number
  default     = 3
}

variable "broker_instance_type" {
  description = "Instance type for Kafka broker nodes"
  type        = string
  default     = "kafka.m5.large"
}

variable "ebs_volume_size" {
  description = "EBS volume size in GiB per broker"
  type        = number
  default     = 500
}

variable "provisioned_throughput_enabled" {
  description = "Enable provisioned throughput for EBS"
  type        = bool
  default     = false
}

variable "volume_throughput" {
  description = "Provisioned throughput in MiB/s"
  type        = number
  default     = 250
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the broker nodes"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect"
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption at rest"
  type        = string
  default     = null
}

variable "encryption_in_transit" {
  description = "Client-broker encryption in transit (TLS, TLS_PLAINTEXT, PLAINTEXT)"
  type        = string
  default     = "TLS"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
