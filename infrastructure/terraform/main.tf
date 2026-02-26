###############################################################################
# Muzayede Platform — Root Terraform Configuration
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "s3" {
    bucket         = "muzayede-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "muzayede-terraform-locks"
  }
}

# -----------------------------------------------------------------------------
# AWS Provider
# -----------------------------------------------------------------------------
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "muzayede-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
