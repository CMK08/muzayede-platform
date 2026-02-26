###############################################################################
# S3 + CloudFront Module
###############################################################################

locals {
  buckets = {
    media   = "${var.project_name}-${var.environment}-media"
    static  = "${var.project_name}-${var.environment}-static"
    backups = "${var.project_name}-${var.environment}-backups"
  }
}

# -----------------------------------------------------------------------------
# S3 Buckets
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "buckets" {
  for_each = local.buckets

  bucket = each.value

  tags = merge(var.tags, {
    Name = each.value
    Type = each.key
  })
}

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rules for backups bucket
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.buckets["backups"].id

  rule {
    id     = "archive-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# CORS for media bucket
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.buckets["media"].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC for ${var.project_name} S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} ${var.environment} CDN"
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"
  aliases             = var.domain_aliases
  web_acl_id          = var.waf_web_acl_arn

  # Media origin
  origin {
    domain_name              = aws_s3_bucket.buckets["media"].bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
    origin_id                = "media"
  }

  # Static origin
  origin {
    domain_name              = aws_s3_bucket.buckets["static"].bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
    origin_id                = "static"
  }

  # Default cache behavior (static assets)
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Media cache behavior
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "media"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      query_string_cache_keys = ["w", "h", "q"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 604800
    max_ttl     = 31536000
  }

  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn != "" ? var.certificate_arn : null
    cloudfront_default_certificate = var.certificate_arn == ""
    ssl_support_method       = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cdn"
  })
}

# -----------------------------------------------------------------------------
# S3 Bucket Policies for CloudFront
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "s3_cloudfront" {
  for_each = {
    media  = aws_s3_bucket.buckets["media"]
    static = aws_s3_bucket.buckets["static"]
  }

  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${each.value.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudfront" {
  for_each = {
    media  = aws_s3_bucket.buckets["media"]
    static = aws_s3_bucket.buckets["static"]
  }

  bucket = each.value.id
  policy = data.aws_iam_policy_document.s3_cloudfront[each.key].json
}
