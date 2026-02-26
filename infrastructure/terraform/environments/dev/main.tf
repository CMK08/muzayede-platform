###############################################################################
# Dev Environment — Terraform Configuration (Smaller Instances)
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
    key            = "environments/dev/terraform.tfstate"
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
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  environment  = "dev"
  project_name = "muzayede"
  common_tags = {
    Project     = "muzayede-platform"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# EKS Cluster (smaller for dev)
# -----------------------------------------------------------------------------
module "eks" {
  source = "../../modules/eks"

  cluster_name       = "${local.project_name}-${local.environment}"
  kubernetes_version = "1.29"
  environment        = local.environment

  vpc_cidr        = "10.10.0.0/16"
  private_subnets = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  public_subnets  = ["10.10.101.0/24", "10.10.102.0/24", "10.10.103.0/24"]

  node_instance_type = "t3.large"
  node_min_size      = 1
  node_max_size      = 4
  node_desired_size  = 2
  node_disk_size     = 50

  enable_fargate = false

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL (smaller for dev)
# -----------------------------------------------------------------------------
module "rds" {
  source = "../../modules/rds"

  identifier    = "${local.project_name}-${local.environment}"
  environment   = local.environment
  engine_version = "16.2"
  instance_class = "db.t4g.medium"

  allocated_storage     = 20
  max_allocated_storage = 100
  multi_az              = false

  database_name   = "muzayede"
  master_username = var.rds_master_username
  master_password = var.rds_master_password

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  backup_retention_period = 7
  create_read_replica     = false

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ElastiCache Redis (smaller for dev)
# -----------------------------------------------------------------------------
module "elasticache" {
  source = "../../modules/elasticache"

  cluster_id    = "${local.project_name}-${local.environment}"
  environment   = local.environment
  engine_version = "7.1"
  node_type     = "cache.t4g.medium"

  cluster_mode_enabled = false
  num_cache_clusters   = 1
  multi_az             = false

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  transit_encryption_enabled = false
  snapshot_retention_limit   = 1

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# S3 + CloudFront (dev)
# -----------------------------------------------------------------------------
module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project_name    = local.project_name
  environment     = local.environment
  certificate_arn = ""
  domain_aliases  = []

  allowed_origins = ["*"]

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# OpenSearch (smaller for dev)
# -----------------------------------------------------------------------------
module "opensearch" {
  source = "../../modules/elasticsearch"

  domain_name = "${local.project_name}-${local.environment}"
  environment = local.environment

  dedicated_master_enabled = false
  data_node_count          = 1
  data_node_type           = "t3.medium.search"
  ebs_volume_size          = 30

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  fine_grained_access_enabled = false
  create_service_linked_role  = false  # Shared with production
  log_retention_days          = 7

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# MSK Kafka (smaller for dev)
# -----------------------------------------------------------------------------
module "kafka" {
  source = "../../modules/kafka"

  cluster_name           = "${local.project_name}-${local.environment}"
  environment            = local.environment
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3
  broker_instance_type   = "kafka.t3.small"
  ebs_volume_size        = 50

  vpc_id     = module.eks.vpc_id
  subnet_ids = module.eks.private_subnet_ids
  allowed_security_group_ids = [module.eks.node_security_group_id]

  encryption_in_transit = "TLS_PLAINTEXT"
  log_retention_days    = 7

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
variable "rds_master_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
  default     = "muzayede_dev"
}

variable "rds_master_password" {
  description = "RDS master password"
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
  value       = module.elasticache.primary_endpoint_address
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
  description = "MSK bootstrap brokers"
  value       = module.kafka.bootstrap_brokers
}
