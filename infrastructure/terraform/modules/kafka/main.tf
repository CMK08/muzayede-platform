###############################################################################
# MSK Module — AWS Managed Streaming for Apache Kafka
###############################################################################

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "msk" {
  name_prefix = "${var.cluster_name}-msk-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.cluster_name} MSK"

  ingress {
    description     = "Kafka plaintext from application"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  ingress {
    description     = "Kafka TLS from application"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  ingress {
    description     = "Kafka IAM auth from application"
    from_port       = 9098
    to_port         = 9098
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  ingress {
    description = "Zookeeper from application"
    from_port   = 2181
    to_port     = 2181
    protocol    = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-msk-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.cluster_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# -----------------------------------------------------------------------------
# MSK Configuration
# -----------------------------------------------------------------------------
resource "aws_msk_configuration" "this" {
  name              = "${var.cluster_name}-config"
  kafka_versions    = [var.kafka_version]
  description       = "Configuration for ${var.cluster_name}"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=true
    default.replication.factor=3
    min.insync.replicas=2
    num.io.threads=8
    num.network.threads=5
    num.partitions=6
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    log.retention.hours=168
    log.retention.bytes=1073741824
    log.segment.bytes=1073741824
    message.max.bytes=10485760
  PROPERTIES
}

# -----------------------------------------------------------------------------
# MSK Cluster
# -----------------------------------------------------------------------------
resource "aws_msk_cluster" "this" {
  cluster_name           = var.cluster_name
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  configuration_info {
    arn      = aws_msk_configuration.this.arn
    revision = aws_msk_configuration.this.latest_revision
  }

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    client_subnets  = var.subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.ebs_volume_size

        provisioned_throughput {
          enabled           = var.provisioned_throughput_enabled
          volume_throughput  = var.provisioned_throughput_enabled ? var.volume_throughput : null
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
    encryption_at_rest_kms_key_arn = var.kms_key_arn

    encryption_in_transit {
      client_broker = var.encryption_in_transit
      in_cluster    = true
    }
  }

  client_authentication {
    sasl {
      iam   = true
      scram = false
    }

    unauthenticated = var.environment != "production"
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

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = merge(var.tags, {
    Name = var.cluster_name
  })
}
