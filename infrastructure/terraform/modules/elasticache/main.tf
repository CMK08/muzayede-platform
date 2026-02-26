###############################################################################
# ElastiCache Module — AWS ElastiCache Redis
###############################################################################

# -----------------------------------------------------------------------------
# Subnet Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_id}-redis-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.cluster_id} ElastiCache Redis"

  ingress {
    description     = "Redis from application"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_id}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.cluster_id}-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "cluster-enabled"
    value = var.cluster_mode_enabled ? "yes" : "no"
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.cluster_id
  description          = "Redis cluster for ${var.cluster_id}"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.this.name

  # Cluster mode configuration
  num_node_groups         = var.cluster_mode_enabled ? var.num_node_groups : null
  replicas_per_node_group = var.cluster_mode_enabled ? var.replicas_per_node_group : null

  # Non-cluster mode
  num_cache_clusters = var.cluster_mode_enabled ? null : var.num_cache_clusters

  automatic_failover_enabled = var.num_cache_clusters > 1 || var.cluster_mode_enabled
  multi_az_enabled           = var.multi_az

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled ? var.auth_token : null

  auto_minor_version_upgrade = true
  maintenance_window         = "Mon:03:00-Mon:04:00"
  snapshot_window            = "01:00-02:00"
  snapshot_retention_limit   = var.snapshot_retention_limit

  notification_topic_arn = var.sns_topic_arn

  tags = merge(var.tags, {
    Name = var.cluster_id
  })
}
