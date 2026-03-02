###############################################################################
# S3 + CloudFront Module - Variables
###############################################################################

variable "project" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "domain_names" {
  description = "List of domain names for CloudFront aliases"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1)"
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "spa_mode" {
  description = "Enable SPA mode (redirect 404/403 to index.html)"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudFront access logs"
  type        = number
  default     = 90
}
