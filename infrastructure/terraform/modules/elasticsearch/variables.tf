###############################################################################
# OpenSearch Module — Variables
###############################################################################

variable "domain_name" {
  description = "OpenSearch domain name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "engine_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "dedicated_master_enabled" {
  description = "Enable dedicated master nodes"
  type        = bool
  default     = true
}

variable "dedicated_master_count" {
  description = "Number of dedicated master nodes"
  type        = number
  default     = 1
}

variable "dedicated_master_type" {
  description = "Instance type for dedicated master nodes"
  type        = string
  default     = "m6g.large.search"
}

variable "data_node_count" {
  description = "Number of data nodes"
  type        = number
  default     = 2
}

variable "data_node_type" {
  description = "Instance type for data nodes"
  type        = string
  default     = "r6g.large.search"
}

variable "ebs_volume_size" {
  description = "EBS volume size in GiB per data node"
  type        = number
  default     = 100
}

variable "ebs_iops" {
  description = "Provisioned IOPS for gp3 volumes"
  type        = number
  default     = 3000
}

variable "ebs_throughput" {
  description = "Provisioned throughput in MiB/s for gp3 volumes"
  type        = number
  default     = 125
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the OpenSearch domain"
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

variable "fine_grained_access_enabled" {
  description = "Enable fine-grained access control"
  type        = bool
  default     = true
}

variable "master_user_name" {
  description = "Master user name for fine-grained access"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "master_user_password" {
  description = "Master user password for fine-grained access"
  type        = string
  default     = null
  sensitive   = true
}

variable "create_service_linked_role" {
  description = "Create the service-linked role for OpenSearch"
  type        = bool
  default     = true
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
