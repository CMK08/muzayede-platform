###############################################################################
# EKS Module - Variables
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
  description = "IDs of private subnets for node groups"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "IDs of public subnets for load balancers"
  type        = list(string)
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS cluster API endpoint is publicly accessible"
  type        = bool
  default     = true
}

variable "cluster_enabled_log_types" {
  description = "List of control plane log types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain cluster logs"
  type        = number
  default     = 30
}

variable "node_groups" {
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
