###############################################################################
# OpenSearch Module - Muzayede Platform
# AWS managed OpenSearch (Elasticsearch) domain
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  name_prefix = "${var.project}-${var.environment}"
  domain_name = "${var.project}-${var.environment}-search"
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "opensearch" {
  name_prefix = "${local.name_prefix}-opensearch-"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-opensearch-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "opensearch_ingress_https" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.opensearch.id
  description              = "Allow HTTPS access from EKS nodes"
}

resource "aws_security_group_rule" "opensearch_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.opensearch.id
  description       = "Allow all outbound traffic"
}

###############################################################################
# KMS Key for OpenSearch Encryption
###############################################################################

resource "aws_kms_key" "opensearch" {
  description             = "KMS key for OpenSearch encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "opensearch" {
  name          = "alias/${local.name_prefix}-opensearch"
  target_key_id = aws_kms_key.opensearch.key_id
}

###############################################################################
# CloudWatch Log Groups
###############################################################################

resource "aws_cloudwatch_log_group" "opensearch_index_slow" {
  name              = "/aws/opensearch/${local.domain_name}/index-slow-logs"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "opensearch_search_slow" {
  name              = "/aws/opensearch/${local.domain_name}/search-slow-logs"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "opensearch_error" {
  name              = "/aws/opensearch/${local.domain_name}/error-logs"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

###############################################################################
# CloudWatch Log Resource Policy
###############################################################################

resource "aws_cloudwatch_log_resource_policy" "opensearch" {
  policy_name = "${local.name_prefix}-opensearch-log-policy"

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
        Resource = "arn:aws:logs:*"
      }
    ]
  })
}

###############################################################################
# IAM Service-Linked Role
###############################################################################

resource "aws_iam_service_linked_role" "opensearch" {
  count            = var.create_service_linked_role ? 1 : 0
  aws_service_name = "opensearchservice.amazonaws.com"
}

###############################################################################
# OpenSearch Domain
###############################################################################

resource "aws_opensearch_domain" "main" {
  domain_name    = local.domain_name
  engine_version = var.engine_version

  cluster_config {
    instance_type            = var.instance_type
    instance_count           = var.instance_count
    dedicated_master_enabled = var.dedicated_master_enabled
    dedicated_master_type    = var.dedicated_master_enabled ? var.dedicated_master_type : null
    dedicated_master_count   = var.dedicated_master_enabled ? var.dedicated_master_count : null
    zone_awareness_enabled   = var.instance_count > 1 ? true : false

    dynamic "zone_awareness_config" {
      for_each = var.instance_count > 1 ? [1] : []
      content {
        availability_zone_count = min(var.instance_count, 3)
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
    subnet_ids         = var.instance_count > 1 ? slice(var.private_subnet_ids, 0, min(var.instance_count, 3)) : [var.private_subnet_ids[0]]
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.opensearch.key_id
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.master_user_name
      master_user_password = var.master_user_password
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_index_slow.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_search_slow.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_error.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "es:*"
        Resource = "arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${local.domain_name}/*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = local.domain_name
  })

  depends_on = [
    aws_iam_service_linked_role.opensearch,
    aws_cloudwatch_log_resource_policy.opensearch,
  ]
}
