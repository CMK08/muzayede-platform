###############################################################################
# VPC Module - Muzayede Platform
# Creates VPC with public/private subnets across 3 AZs, NAT gateways, IGW
###############################################################################

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

###############################################################################
# VPC
###############################################################################

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"
  })
}

###############################################################################
# Internet Gateway
###############################################################################

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-igw"
  })
}

###############################################################################
# Public Subnets
###############################################################################

resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name                                          = "${var.project}-${var.environment}-public-${local.azs[count.index]}"
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${var.project}-${var.environment}" = "shared"
  })
}

###############################################################################
# Private Subnets (Application)
###############################################################################

resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 3)
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name                                          = "${var.project}-${var.environment}-private-${local.azs[count.index]}"
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/${var.project}-${var.environment}" = "shared"
  })
}

###############################################################################
# Database Subnets (Isolated)
###############################################################################

resource "aws_subnet" "database" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 6)
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-database-${local.azs[count.index]}"
  })
}

###############################################################################
# Elastic IP for NAT Gateways
###############################################################################

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : 3) : 0
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-nat-eip-${count.index}"
  })

  depends_on = [aws_internet_gateway.main]
}

###############################################################################
# NAT Gateways
###############################################################################

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : 3) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-nat-${count.index}"
  })

  depends_on = [aws_internet_gateway.main]
}

###############################################################################
# Public Route Table
###############################################################################

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-public-rt"
  })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

###############################################################################
# Private Route Tables
###############################################################################

resource "aws_route_table" "private" {
  count = var.single_nat_gateway ? 1 : 3

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-private-rt-${count.index}"
  })
}

resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : 3) : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
}

###############################################################################
# Database Route Table (no internet access)
###############################################################################

resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-database-rt"
  })
}

resource "aws_route_table_association" "database" {
  count = 3

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

###############################################################################
# VPC Flow Logs
###############################################################################

resource "aws_flow_log" "main" {
  count = var.enable_flow_logs ? 1 : 0

  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  iam_role_arn             = aws_iam_role.flow_log[0].arn
  log_destination          = aws_cloudwatch_log_group.flow_log[0].arn
  max_aggregation_interval = 60

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-flow-log"
  })
}

resource "aws_cloudwatch_log_group" "flow_log" {
  count = var.enable_flow_logs ? 1 : 0

  name              = "/aws/vpc-flow-log/${var.project}-${var.environment}"
  retention_in_days = var.flow_log_retention_days

  tags = local.common_tags
}

resource "aws_iam_role" "flow_log" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.project}-${var.environment}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "flow_log" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.project}-${var.environment}-flow-log-policy"
  role = aws_iam_role.flow_log[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
