###############################################################################
# Dev Environment - Muzayede Platform
# Small instances, cost-optimized, single NAT gateway
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "muzayede-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "muzayede-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Project     = "muzayede"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project     = "muzayede"
  environment = "dev"
  region      = "eu-central-1"
}

###############################################################################
# VPC
###############################################################################

module "vpc" {
  source = "../../modules/vpc"

  project            = local.project
  environment        = local.environment
  vpc_cidr           = "10.0.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = true  # Cost saving: single NAT for dev
  enable_flow_logs   = true
  flow_log_retention_days = 7
}

###############################################################################
# EKS
###############################################################################

module "eks" {
  source = "../../modules/eks"

  project            = local.project
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  cluster_version    = "1.29"

  cluster_endpoint_public_access = true
  cluster_log_retention_days     = 7

  node_groups = {
    general = {
      instance_types = ["t3.medium"]
      desired_size   = 2
      min_size       = 1
      max_size       = 4
      disk_size      = 30
      labels = {
        workload = "general"
      }
    }
  }
}

###############################################################################
# RDS PostgreSQL
###############################################################################

module "rds" {
  source = "../../modules/rds"

  project                   = local.project
  environment               = local.environment
  vpc_id                    = module.vpc.vpc_id
  database_subnet_ids       = module.vpc.database_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version        = "16.3"
  instance_class        = "db.t3.medium"
  allocated_storage     = 20
  max_allocated_storage = 50
  multi_az              = false
  database_name         = "muzayede"

  backup_retention_period      = 3
  deletion_protection          = false
  skip_final_snapshot          = true
  performance_insights_enabled = false
  enhanced_monitoring_interval = 0
}

###############################################################################
# ElastiCache Redis
###############################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  project                   = local.project
  environment               = local.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version           = "7.1"
  node_type                = "cache.t3.micro"
  num_cache_clusters       = 1        # Single node for dev
  multi_az_enabled         = false
  snapshot_retention_limit = 1
}

###############################################################################
# S3 + CloudFront
###############################################################################

module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project                = local.project
  environment            = local.environment
  cloudfront_price_class = "PriceClass_100"  # Europe and North America only
  spa_mode               = true
  log_retention_days     = 30
}

###############################################################################
# OpenSearch
###############################################################################

module "elasticsearch" {
  source = "../../modules/elasticsearch"

  project                   = local.project
  environment               = local.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version           = "OpenSearch_2.11"
  instance_type            = "t3.small.search"
  instance_count           = 1
  dedicated_master_enabled = false
  ebs_volume_size          = 10
  master_user_password     = var.opensearch_master_password

  create_service_linked_role = true
}

###############################################################################
# MSK (Kafka)
###############################################################################

module "kafka" {
  source = "../../modules/kafka"

  project                   = local.project
  environment               = local.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3
  broker_instance_type   = "kafka.t3.small"
  broker_ebs_volume_size = 50
  enhanced_monitoring    = "DEFAULT"
  log_retention_hours    = 72
}

###############################################################################
# Variables
###############################################################################

variable "opensearch_master_password" {
  description = "Master password for OpenSearch"
  type        = string
  sensitive   = true
}

###############################################################################
# Outputs
###############################################################################

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  value = module.elasticache.primary_endpoint_address
}

output "cloudfront_domain" {
  value = module.s3_cloudfront.cloudfront_domain_name
}

output "opensearch_endpoint" {
  value = module.elasticsearch.domain_endpoint
}

output "kafka_bootstrap_brokers" {
  value = module.kafka.bootstrap_brokers_tls
}
