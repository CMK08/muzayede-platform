###############################################################################
# MSK (Kafka) Module - Muzayede Platform
# Amazon Managed Streaming for Apache Kafka cluster
###############################################################################

data "aws_caller_identity" "current" {}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  name_prefix = "${var.project}-${var.environment}"
}

###############################################################################
# Security Group
###############################################################################

resource "aws_security_group" "msk" {
  name_prefix = "${local.name_prefix}-msk-"
  description = "Security group for MSK (Kafka) cluster"
  vpc_id      = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-msk-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "msk_ingress_plaintext" {
  type                     = "ingress"
  from_port                = 9092
  to_port                  = 9092
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Kafka plaintext access from EKS nodes"
}

resource "aws_security_group_rule" "msk_ingress_tls" {
  type                     = "ingress"
  from_port                = 9094
  to_port                  = 9094
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Kafka TLS access from EKS nodes"
}

resource "aws_security_group_rule" "msk_ingress_sasl" {
  type                     = "ingress"
  from_port                = 9096
  to_port                  = 9096
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Allow Kafka SASL/SCRAM access from EKS nodes"
}

resource "aws_security_group_rule" "msk_ingress_zookeeper" {
  type                     = "ingress"
  from_port                = 2181
  to_port                  = 2181
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_id
  security_group_id        = aws_security_group.msk.id
  description              = "Allow ZooKeeper access from EKS nodes"
}

resource "aws_security_group_rule" "msk_ingress_self" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.msk.id
  security_group_id        = aws_security_group.msk.id
  description              = "Allow inter-broker communication"
}

resource "aws_security_group_rule" "msk_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.msk.id
  description       = "Allow all outbound traffic"
}

###############################################################################
# KMS Key for MSK Encryption
###############################################################################

resource "aws_kms_key" "msk" {
  description             = "KMS key for MSK encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "msk" {
  name          = "alias/${local.name_prefix}-msk"
  target_key_id = aws_kms_key.msk.key_id
}

###############################################################################
# CloudWatch Log Group
###############################################################################

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${local.name_prefix}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

###############################################################################
# S3 Bucket for MSK Broker Logs
###############################################################################

resource "aws_s3_bucket" "msk_logs" {
  bucket = "${local.name_prefix}-msk-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-msk-logs"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "msk_logs" {
  bucket = aws_s3_bucket.msk_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "msk_logs" {
  bucket = aws_s3_bucket.msk_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "msk_logs" {
  bucket = aws_s3_bucket.msk_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = var.s3_log_retention_days
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

###############################################################################
# MSK Configuration
###############################################################################

resource "aws_msk_configuration" "main" {
  name              = "${local.name_prefix}-kafka-config"
  kafka_versions    = [var.kafka_version]
  description       = "MSK configuration for ${local.name_prefix}"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    default.replication.factor=${min(var.number_of_broker_nodes, 3)}
    min.insync.replicas=${min(var.number_of_broker_nodes, 3) > 1 ? min(var.number_of_broker_nodes, 3) - 1 : 1}
    num.io.threads=8
    num.network.threads=5
    num.partitions=6
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    zookeeper.session.timeout.ms=18000
    log.retention.hours=${var.log_retention_hours}
    log.retention.bytes=${var.log_retention_bytes}
    message.max.bytes=10485760
  PROPERTIES
}

###############################################################################
# MSK Cluster
###############################################################################

resource "aws_msk_cluster" "main" {
  cluster_name           = "${local.name_prefix}-kafka"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.broker_ebs_volume_size

        provisioned_throughput {
          enabled           = var.broker_ebs_volume_size >= 300
          volume_throughput = var.broker_ebs_volume_size >= 300 ? var.provisioned_throughput : null
        }
      }
    }

    connectivity_info {
      public_access {
        type = "DISABLED"
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn

    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      scram = true
      iam   = true
    }

    tls {}
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }

      s3_logs {
        enabled = true
        bucket  = aws_s3_bucket.msk_logs.id
        prefix  = "broker-logs"
      }
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }

      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  enhanced_monitoring = var.enhanced_monitoring

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kafka"
  })
}
