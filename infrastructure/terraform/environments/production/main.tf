###############################################################################
# Production Environment — Terraform Configuration
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  backend "s3" {
    bucket         = "muzayede-terraform-state"
    key            = "environments/production/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "muzayede-terraform-locks"
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Project     = "muzayede-platform"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  environment  = "production"
  project_name = "muzayede"
  common_tags = {
    Project     = "muzayede-platform"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# EKS Cluster
# -----------------------------------------------------------------------------
module "eks" {
  source = "../../modules/eks"

  cluster_name       = "${local.project_name}-${local.environment}"
  kubernetes_version = "1.29"
  environment        = local.environment

  vpc_cidr        = "10.0.0.0/16"
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  node_instance_type = "t3.xlarge"
  node_min_size      = 3
  node_max_size      = 10
  node_desired_size  = 3
  node_disk_size     = 100

  enable_fargate = false

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL
# -----------------------------------------------------------------------------
module "rds" {
  source = "../../modules/rds"

  identifier    = "${local.project_name}-${local.environment}"
  environment   = local.environment
  engine_version = "16.2"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500
  multi_az              = true

  database_name   = "muzayede"
  master_username = var.rds_master_username
  master_password = var.rds_master_password

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  backup_retention_period = 30
  create_read_replica     = true
  replica_instance_class  = "db.r6g.large"

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ElastiCache Redis
# -----------------------------------------------------------------------------
module "elasticache" {
  source = "../../modules/elasticache"

  cluster_id    = "${local.project_name}-${local.environment}"
  environment   = local.environment
  engine_version = "7.1"
  node_type     = "cache.r6g.large"

  cluster_mode_enabled    = true
  num_node_groups         = 3
  replicas_per_node_group = 1
  multi_az                = true

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  snapshot_retention_limit   = 7

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 + CloudFront
# -----------------------------------------------------------------------------
module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project_name    = local.project_name
  environment     = local.environment
  certificate_arn = var.certificate_arn
  domain_aliases  = ["cdn.muzayede.com", "static.muzayede.com"]

  allowed_origins = [
    "https://muzayede.com",
    "https://www.muzayede.com",
    "https://api.muzayede.com"
  ]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# OpenSearch
# -----------------------------------------------------------------------------
module "opensearch" {
  source = "../../modules/elasticsearch"

  domain_name = "${local.project_name}-${local.environment}"
  environment = local.environment

  dedicated_master_enabled = true
  dedicated_master_count   = 1
  dedicated_master_type    = "m6g.large.search"
  data_node_count          = 2
  data_node_type           = "r6g.large.search"
  ebs_volume_size          = 100

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  fine_grained_access_enabled = true
  master_user_name            = var.opensearch_master_user
  master_user_password        = var.opensearch_master_password

  create_service_linked_role = true
  log_retention_days         = 90

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# MSK (Kafka)
# -----------------------------------------------------------------------------
module "kafka" {
  source = "../../modules/kafka"

  cluster_name           = "${local.project_name}-${local.environment}"
  environment            = local.environment
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3
  broker_instance_type   = "kafka.m5.large"
  ebs_volume_size        = 500

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  encryption_in_transit = "TLS"
  log_retention_days    = 90

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Variables (secrets — pass via terraform.tfvars or CI/CD)
# -----------------------------------------------------------------------------
variable "rds_master_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
}

variable "rds_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

variable "certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1)"
  type        = string
}

variable "opensearch_master_user" {
  description = "OpenSearch master username"
  type        = string
  sensitive   = true
  default     = "admin"
}

variable "opensearch_master_password" {
  description = "OpenSearch master password"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.configuration_endpoint_address
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.s3_cloudfront.cloudfront_domain_name
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.endpoint
}

output "kafka_bootstrap_brokers" {
  description = "MSK bootstrap brokers (TLS)"
  value       = module.kafka.bootstrap_brokers_tls
}
