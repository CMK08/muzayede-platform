###############################################################################
# ElastiCache Module - Muzayede Platform
# ElastiCache Redis 7 cluster with encryption at rest and in transit
###############################################################################

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  name_prefix = "${var.project}-${var.environment}"
}

###############################################################################
# Subnet Group
###############################################################################

resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet-group"
  description = "Redis subnet group for ${local.name_prefix}"
  subnet_ids  = var.private_subnet_ids

  tags = local.common_tags
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "redis_ingress" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.redis.id
  description              = "Allow Redis access from EKS nodes"
}

resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.redis.id
  description       = "Allow all outbound traffic"
}

###############################################################################
# KMS Key for Redis Encryption
###############################################################################

resource "aws_kms_key" "redis" {
  description             = "KMS key for ElastiCache Redis encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "redis" {
  name          = "alias/${local.name_prefix}-redis"
  target_key_id = aws_kms_key.redis.key_id
}

###############################################################################
# Parameter Group
###############################################################################

resource "aws_elasticache_parameter_group" "main" {
  name        = "${local.name_prefix}-redis7"
  family      = "redis7"
  description = "Custom Redis 7 parameter group for ${local.name_prefix}"

  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  tags = local.common_tags
}

###############################################################################
# ElastiCache Replication Group (Redis Cluster)
###############################################################################

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis cluster for ${local.name_prefix}"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  num_cache_clusters = var.num_cache_clusters

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.redis.arn
  transit_encryption_enabled = true

  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false
  multi_az_enabled           = var.num_cache_clusters > 1 ? var.multi_az_enabled : false

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "mon:05:00-mon:07:00"

  auto_minor_version_upgrade = true

  notification_topic_arn = var.sns_topic_arn

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

###############################################################################
# CloudWatch Log Groups
###############################################################################

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${local.name_prefix}-redis/slow-log"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${local.name_prefix}-redis/engine-log"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}
