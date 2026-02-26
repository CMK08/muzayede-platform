###############################################################################
# RDS Module — AWS RDS PostgreSQL
###############################################################################

# -----------------------------------------------------------------------------
# Subnet Group
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.identifier}-subnet-group"
  })
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name_prefix = "${var.identifier}-rds-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.identifier} RDS PostgreSQL"

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
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
    Name = "${var.identifier}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------
resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.identifier}-pg16-"
  family      = "postgres16"
  description = "Custom parameter group for ${var.identifier}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  tags = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# RDS Instance
# -----------------------------------------------------------------------------
resource "aws_db_instance" "this" {
  identifier = var.identifier

  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id           = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  port     = 5432

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  backup_retention_period   = var.backup_retention_period
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true

  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.identifier}-final-snapshot" : null
  copy_tags_to_snapshot     = true

  performance_insights_enabled          = true
  performance_insights_retention_period = var.environment == "production" ? 731 : 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = var.identifier
  })
}

# -----------------------------------------------------------------------------
# Read Replica (production only)
# -----------------------------------------------------------------------------
resource "aws_db_instance" "read_replica" {
  count = var.create_read_replica ? 1 : 0

  identifier          = "${var.identifier}-read-replica"
  replicate_source_db = aws_db_instance.this.identifier

  instance_class  = var.replica_instance_class
  storage_type    = "gp3"

  multi_az               = false
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  auto_minor_version_upgrade = true
  skip_final_snapshot        = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = merge(var.tags, {
    Name = "${var.identifier}-read-replica"
  })
}

# -----------------------------------------------------------------------------
# Enhanced Monitoring IAM Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "${var.identifier}-rds-monitoring-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
