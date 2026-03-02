###############################################################################
# Backend Configuration - Muzayede Platform
# S3 backend with DynamoDB state locking
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Uncomment and configure for the specific environment when using root module directly.
  # For per-environment usage, backends are configured in environments/*/main.tf.
  #
  # backend "s3" {
  #   bucket         = "muzayede-terraform-state"
  #   key            = "root/terraform.tfstate"
  #   region         = "eu-central-1"
  #   dynamodb_table = "muzayede-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
