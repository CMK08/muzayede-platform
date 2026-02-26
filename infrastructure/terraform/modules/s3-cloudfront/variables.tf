###############################################################################
# S3 + CloudFront Module — Variables
###############################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN for CloudFront SSL (must be in us-east-1)"
  type        = string
  default     = ""
}

variable "domain_aliases" {
  description = "Domain aliases for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "allowed_origins" {
  description = "Allowed CORS origins for the media bucket"
  type        = list(string)
  default     = ["*"]
}

variable "kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  type        = string
  default     = null
}

variable "waf_web_acl_arn" {
  description = "WAF Web ACL ARN to associate with CloudFront"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
