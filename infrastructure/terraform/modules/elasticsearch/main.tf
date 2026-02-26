###############################################################################
# OpenSearch Module — AWS OpenSearch Service
###############################################################################

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "opensearch" {
  name_prefix = "${var.domain_name}-opensearch-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.domain_name} OpenSearch"

  ingress {
    description     = "HTTPS from application"
    from_port       = 443
    to_port         = 443
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
    Name = "${var.domain_name}-opensearch-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Service-linked Role
# -----------------------------------------------------------------------------
resource "aws_iam_service_linked_role" "opensearch" {
  count            = var.create_service_linked_role ? 1 : 0
  aws_service_name = "opensearchservice.amazonaws.com"
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "opensearch" {
  name              = "/aws/opensearch/${var.domain_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_resource_policy" "opensearch" {
  policy_name = "${var.domain_name}-opensearch-logs"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
        Action = [
          "logs:PutLogEvents",
          "logs:PutLogEventsBatch",
          "logs:CreateLogStream"
        ]
        Resource = "${aws_cloudwatch_log_group.opensearch.arn}:*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# OpenSearch Domain
# -----------------------------------------------------------------------------
resource "aws_opensearch_domain" "this" {
  domain_name    = var.domain_name
  engine_version = var.engine_version

  cluster_config {
    dedicated_master_enabled = var.dedicated_master_enabled
    dedicated_master_count   = var.dedicated_master_enabled ? var.dedicated_master_count : null
    dedicated_master_type    = var.dedicated_master_enabled ? var.dedicated_master_type : null

    instance_count = var.data_node_count
    instance_type  = var.data_node_type

    zone_awareness_enabled = var.data_node_count > 1

    dynamic "zone_awareness_config" {
      for_each = var.data_node_count > 1 ? [1] : []
      content {
        availability_zone_count = min(var.data_node_count, 3)
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.ebs_volume_size
    iops        = var.ebs_iops
    throughput   = var.ebs_throughput
  }

  vpc_options {
    subnet_ids         = slice(var.subnet_ids, 0, min(var.data_node_count, length(var.subnet_ids)))
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = var.kms_key_arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = var.fine_grained_access_enabled
    internal_user_database_enabled = var.fine_grained_access_enabled
    anonymous_auth_enabled         = false

    dynamic "master_user_options" {
      for_each = var.fine_grained_access_enabled ? [1] : []
      content {
        master_user_name     = var.master_user_name
        master_user_password = var.master_user_password
      }
    }
  }

  auto_tune_options {
    desired_state       = "ENABLED"
    rollback_on_disable = "NO_ROLLBACK"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }

  tags = merge(var.tags, {
    Name = var.domain_name
  })

  depends_on = [
    aws_iam_service_linked_role.opensearch,
    aws_cloudwatch_log_resource_policy.opensearch
  ]
}
