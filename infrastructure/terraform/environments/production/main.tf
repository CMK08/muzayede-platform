###############################################################################
# Production Environment - Muzayede Platform
# High availability, multi-AZ, full redundancy, production-grade
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
    key            = "environments/production/terraform.tfstate"
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
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project     = "muzayede"
  environment = "production"
  region      = "eu-central-1"
}

###############################################################################
# VPC
###############################################################################

module "vpc" {
  source = "../../modules/vpc"

  project            = local.project
  environment        = local.environment
  vpc_cidr           = "10.2.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = false  # One NAT per AZ for HA
  enable_flow_logs   = true
  flow_log_retention_days = 90
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

  cluster_endpoint_public_access = false  # Private only in production
  cluster_log_retention_days     = 90

  node_groups = {
    general = {
      instance_types = ["m6i.xlarge"]
      desired_size   = 4
      min_size       = 3
      max_size       = 10
      disk_size      = 100
      labels = {
        workload = "general"
      }
    }
    compute = {
      instance_types = ["c6i.2xlarge"]
      desired_size   = 2
      min_size       = 2
      max_size       = 8
      disk_size      = 100
      labels = {
        workload = "compute"
      }
    }
    realtime = {
      instance_types = ["m6i.xlarge"]
      desired_size   = 2
      min_size       = 2
      max_size       = 6
      disk_size      = 50
      labels = {
        workload = "realtime"
      }
      taints = [
        {
          key    = "dedicated"
          value  = "realtime"
          effect = "NO_SCHEDULE"
        }
      ]
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
  instance_class        = "db.r6g.2xlarge"
  allocated_storage     = 200
  max_allocated_storage = 1000
  multi_az              = true
  database_name         = "muzayede"

  backup_retention_period               = 35
  deletion_protection                   = true
  skip_final_snapshot                   = false
  performance_insights_enabled          = true
  performance_insights_retention_period = 731  # 2 years
  enhanced_monitoring_interval          = 30

  create_read_replica    = true
  replica_instance_class = "db.r6g.xlarge"
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
  node_type                = "cache.r6g.xlarge"
  num_cache_clusters       = 3  # One per AZ
  multi_az_enabled         = true
  snapshot_retention_limit = 7
}

###############################################################################
# S3 + CloudFront
###############################################################################

module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project                = local.project
  environment            = local.environment
  cloudfront_price_class = "PriceClass_200"  # Global except South America, Australia
  domain_names           = var.cdn_domain_names
  acm_certificate_arn    = var.acm_certificate_arn
  spa_mode               = true
  log_retention_days     = 365

  cors_allowed_origins = var.cors_allowed_origins
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
  instance_type            = "r6g.xlarge.search"
  instance_count           = 3
  dedicated_master_enabled = true
  dedicated_master_type    = "r6g.large.search"
  dedicated_master_count   = 3
  ebs_volume_size          = 200
  ebs_iops                 = 6000
  ebs_throughput           = 250
  master_user_password     = var.opensearch_master_password
  log_retention_days       = 90

  create_service_linked_role = false  # Already created
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
  number_of_broker_nodes = 6    # 2 per AZ for HA
  broker_instance_type   = "kafka.m5.2xlarge"
  broker_ebs_volume_size = 500
  enhanced_monitoring    = "PER_TOPIC_PER_PARTITION"
  log_retention_hours    = 336  # 14 days
  s3_log_retention_days  = 365
}

###############################################################################
# Variables
###############################################################################

variable "opensearch_master_password" {
  description = "Master password for OpenSearch"
  type        = string
  sensitive   = true
}

variable "cdn_domain_names" {
  description = "Domain names for CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront HTTPS (us-east-1)"
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for S3"
  type        = list(string)
  default     = ["https://muzayede.com", "https://www.muzayede.com"]
}

###############################################################################
# Outputs
###############################################################################

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value     = module.eks.cluster_endpoint
  sensitive = true
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "rds_replica_endpoint" {
  value = module.rds.db_replica_endpoint
}

output "rds_password_secret_arn" {
  value = module.rds.db_master_password_secret_arn
}

output "redis_primary_endpoint" {
  value = module.elasticache.primary_endpoint_address
}

output "redis_reader_endpoint" {
  value = module.elasticache.reader_endpoint_address
}

output "cloudfront_distribution_id" {
  value = module.s3_cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain" {
  value = module.s3_cloudfront.cloudfront_domain_name
}

output "opensearch_endpoint" {
  value = module.elasticsearch.domain_endpoint
}

output "opensearch_dashboard_endpoint" {
  value = module.elasticsearch.dashboard_endpoint
}

output "kafka_bootstrap_brokers_tls" {
  value = module.kafka.bootstrap_brokers_tls
}

output "kafka_bootstrap_brokers_sasl_iam" {
  value = module.kafka.bootstrap_brokers_sasl_iam
}

output "kafka_zookeeper_connect" {
  value = module.kafka.zookeeper_connect_string_tls
}
