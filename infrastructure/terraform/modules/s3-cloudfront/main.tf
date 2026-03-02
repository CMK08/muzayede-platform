###############################################################################
# S3 + CloudFront Module - Muzayede Platform
# S3 bucket with CloudFront distribution for static assets
###############################################################################

data "aws_caller_identity" "current" {}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  name_prefix = "${var.project}-${var.environment}"
  bucket_name = "${local.name_prefix}-static-assets-${data.aws_caller_identity.current.account_id}"
}

###############################################################################
# S3 Bucket
###############################################################################

resource "aws_s3_bucket" "static_assets" {
  bucket = local.bucket_name

  tags = merge(local.common_tags, {
    Name = local.bucket_name
  })
}

resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    noncurrent_version_transition {
      noncurrent_days = 7
      storage_class   = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

###############################################################################
# S3 Bucket Policy - CloudFront OAC Access
###############################################################################

resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.static_assets]
}

###############################################################################
# KMS Key for S3 Encryption
###############################################################################

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 static assets encryption - ${local.name_prefix}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudFrontDecrypt"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.name_prefix}-s3-static"
  target_key_id = aws_kms_key.s3.key_id
}

###############################################################################
# CloudFront Origin Access Control
###############################################################################

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${local.name_prefix}-s3-oac"
  description                       = "OAC for ${local.name_prefix} S3 static assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

###############################################################################
# CloudFront Distribution
###############################################################################

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} static assets distribution"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  http_version        = "http2and3"
  aliases             = var.domain_names

  origin {
    domain_name              = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id                = "S3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${local.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.main.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.main.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  dynamic "custom_error_response" {
    for_each = var.spa_mode ? [1] : []
    content {
      error_code            = 404
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 10
    }
  }

  dynamic "custom_error_response" {
    for_each = var.spa_mode ? [1] : []
    content {
      error_code            = 403
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 10
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == null
    acm_certificate_arn            = var.acm_certificate_arn
    minimum_protocol_version       = var.acm_certificate_arn != null ? "TLSv1.2_2021" : null
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
  }

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront/"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cf-distribution"
  })
}

###############################################################################
# CloudFront Cache Policy
###############################################################################

resource "aws_cloudfront_cache_policy" "main" {
  name        = "${local.name_prefix}-cache-policy"
  comment     = "Cache policy for ${local.name_prefix} static assets"
  default_ttl = 86400
  min_ttl     = 1
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

###############################################################################
# CloudFront Origin Request Policy
###############################################################################

resource "aws_cloudfront_origin_request_policy" "main" {
  name    = "${local.name_prefix}-origin-request-policy"
  comment = "Origin request policy for ${local.name_prefix}"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

###############################################################################
# CloudFront Response Headers Policy (Security Headers)
###############################################################################

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${local.name_prefix}-security-headers"
  comment = "Security headers policy for ${local.name_prefix}"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}

###############################################################################
# CloudFront Access Logs Bucket
###############################################################################

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-cf-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cf-logs"
  })
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "logs" {
  bucket = aws_s3_bucket.logs.id
  acl    = "log-delivery-write"

  depends_on = [aws_s3_bucket_ownership_controls.logs]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = var.log_retention_days
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}
