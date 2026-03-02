###############################################################################
# OpenSearch Module - Variables
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
  description = "IDs of private subnets for OpenSearch"
  type        = list(string)
}

variable "allowed_security_group_id" {
  description = "Security group ID allowed to connect to OpenSearch (typically EKS node SG)"
  type        = string
}

variable "engine_version" {
  description = "OpenSearch engine version"
  type        = string
  default     = "OpenSearch_2.11"
}

variable "instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "t3.medium.search"
}

variable "instance_count" {
  description = "Number of instances in the OpenSearch domain"
  type        = number
  default     = 2
}

variable "dedicated_master_enabled" {
  description = "Enable dedicated master nodes"
  type        = bool
  default     = false
}

variable "dedicated_master_type" {
  description = "Instance type for dedicated master nodes"
  type        = string
  default     = "t3.medium.search"
}

variable "dedicated_master_count" {
  description = "Number of dedicated master nodes"
  type        = number
  default     = 3
}

variable "ebs_volume_size" {
  description = "Size of EBS volume in GB per data node"
  type        = number
  default     = 20
}

variable "ebs_iops" {
  description = "IOPS for gp3 EBS volumes"
  type        = number
  default     = 3000
}

variable "ebs_throughput" {
  description = "Throughput in MiB/s for gp3 EBS volumes"
  type        = number
  default     = 125
}

variable "master_user_name" {
  description = "Master user name for OpenSearch"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "master_user_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "create_service_linked_role" {
  description = "Create the service-linked role for OpenSearch (only needed once per account)"
  type        = bool
  default     = true
}
