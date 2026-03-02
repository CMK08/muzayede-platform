###############################################################################
# Staging Environment - Muzayede Platform
# Medium instances, closer to production topology
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
    key            = "environments/staging/terraform.tfstate"
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
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project     = "muzayede"
  environment = "staging"
  region      = "eu-central-1"
}

###############################################################################
# VPC
###############################################################################

module "vpc" {
  source = "../../modules/vpc"

  project            = local.project
  environment        = local.environment
  vpc_cidr           = "10.1.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = true  # Single NAT for staging
  enable_flow_logs   = true
  flow_log_retention_days = 14
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
  cluster_log_retention_days     = 14

  node_groups = {
    general = {
      instance_types = ["t3.large"]
      desired_size   = 3
      min_size       = 2
      max_size       = 6
      disk_size      = 50
      labels = {
        workload = "general"
      }
    }
    compute = {
      instance_types = ["c5.xlarge"]
      desired_size   = 1
      min_size       = 0
      max_size       = 3
      disk_size      = 50
      labels = {
        workload = "compute"
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
  instance_class        = "db.r6g.large"
  allocated_storage     = 50
  max_allocated_storage = 200
  multi_az              = true
  database_name         = "muzayede"

  backup_retention_period      = 7
  deletion_protection          = true
  skip_final_snapshot          = false
  performance_insights_enabled = true
  enhanced_monitoring_interval = 60
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
  node_type                = "cache.r6g.large"
  num_cache_clusters       = 2
  multi_az_enabled         = true
  snapshot_retention_limit = 3
}

###############################################################################
# S3 + CloudFront
###############################################################################

module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project                = local.project
  environment            = local.environment
  cloudfront_price_class = "PriceClass_100"
  spa_mode               = true
  log_retention_days     = 60
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
  instance_type            = "r6g.large.search"
  instance_count           = 2
  dedicated_master_enabled = false
  ebs_volume_size          = 50
  master_user_password     = var.opensearch_master_password

  create_service_linked_role = false  # Already created in dev
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
  broker_instance_type   = "kafka.m5.large"
  broker_ebs_volume_size = 200
  enhanced_monitoring    = "PER_TOPIC_PER_BROKER"
  log_retention_hours    = 168
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

output "rds_password_secret_arn" {
  value = module.rds.db_master_password_secret_arn
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
