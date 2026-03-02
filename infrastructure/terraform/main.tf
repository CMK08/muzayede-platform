###############################################################################
# Root Module Composition - Muzayede Platform
# Orchestrates all infrastructure modules
###############################################################################

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

###############################################################################
# VPC
###############################################################################

module "vpc" {
  source = "./modules/vpc"

  project            = var.project
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  enable_flow_logs   = var.enable_flow_logs
  flow_log_retention_days = var.flow_log_retention_days
}

###############################################################################
# EKS
###############################################################################

module "eks" {
  source = "./modules/eks"

  project            = var.project
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  cluster_version    = var.eks_cluster_version

  cluster_endpoint_public_access = var.eks_cluster_endpoint_public_access
  cluster_log_retention_days     = var.eks_cluster_log_retention_days
  node_groups                    = var.eks_node_groups
}

###############################################################################
# RDS PostgreSQL
###############################################################################

module "rds" {
  source = "./modules/rds"

  project                   = var.project
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  database_subnet_ids       = module.vpc.database_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version                        = var.rds_engine_version
  instance_class                        = var.rds_instance_class
  allocated_storage                     = var.rds_allocated_storage
  max_allocated_storage                 = var.rds_max_allocated_storage
  multi_az                              = var.rds_multi_az
  database_name                         = var.rds_database_name
  backup_retention_period               = var.rds_backup_retention_period
  deletion_protection                   = var.rds_deletion_protection
  skip_final_snapshot                   = var.rds_skip_final_snapshot
  performance_insights_enabled          = var.rds_performance_insights_enabled
  performance_insights_retention_period = var.rds_performance_insights_retention_period
  enhanced_monitoring_interval          = var.rds_enhanced_monitoring_interval
  create_read_replica                   = var.rds_create_read_replica
  replica_instance_class                = var.rds_replica_instance_class
}

###############################################################################
# ElastiCache Redis
###############################################################################

module "elasticache" {
  source = "./modules/elasticache"

  project                   = var.project
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version           = var.redis_engine_version
  node_type                = var.redis_node_type
  num_cache_clusters       = var.redis_num_cache_clusters
  multi_az_enabled         = var.redis_multi_az_enabled
  snapshot_retention_limit = var.redis_snapshot_retention_limit
}

###############################################################################
# S3 + CloudFront
###############################################################################

module "s3_cloudfront" {
  source = "./modules/s3-cloudfront"

  project                = var.project
  environment            = var.environment
  cloudfront_price_class = var.cloudfront_price_class
  domain_names           = var.cdn_domain_names
  acm_certificate_arn    = var.acm_certificate_arn
  cors_allowed_origins   = var.cors_allowed_origins
  spa_mode               = var.spa_mode
  log_retention_days     = var.cloudfront_log_retention_days
}

###############################################################################
# OpenSearch
###############################################################################

module "elasticsearch" {
  source = "./modules/elasticsearch"

  project                   = var.project
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  engine_version           = var.opensearch_engine_version
  instance_type            = var.opensearch_instance_type
  instance_count           = var.opensearch_instance_count
  dedicated_master_enabled = var.opensearch_dedicated_master_enabled
  dedicated_master_type    = var.opensearch_dedicated_master_type
  dedicated_master_count   = var.opensearch_dedicated_master_count
  ebs_volume_size          = var.opensearch_ebs_volume_size
  master_user_password     = var.opensearch_master_password

  create_service_linked_role = var.opensearch_create_service_linked_role
}

###############################################################################
# MSK (Kafka)
###############################################################################

module "kafka" {
  source = "./modules/kafka"

  project                   = var.project
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  allowed_security_group_id = module.eks.node_security_group_id

  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.kafka_number_of_broker_nodes
  broker_instance_type   = var.kafka_broker_instance_type
  broker_ebs_volume_size = var.kafka_broker_ebs_volume_size
  enhanced_monitoring    = var.kafka_enhanced_monitoring
  log_retention_hours    = var.kafka_log_retention_hours
}
