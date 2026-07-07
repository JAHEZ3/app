# ─────────────────────────────────────────────────────────────────────────────
# Static hosting for each Next.js app: private S3 bucket served through
# CloudFront using Origin Access Control (OAC). CI uploads the `out/` folder
# (from `next build` with output:"export") and invalidates the CDN cache.
# ─────────────────────────────────────────────────────────────────────────────

locals {
  name = "${var.project}-${var.environment}"
}

resource "aws_s3_bucket" "site" {
  for_each = var.sites
  bucket   = "${local.name}-web-${each.key}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "site" {
  for_each                = var.sites
  bucket                  = aws_s3_bucket.site[each.key].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "site" {
  for_each                          = var.sites
  name                              = "${local.name}-${each.key}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  for_each            = var.sites
  enabled             = true
  default_root_object = "index.html"
  comment             = "${local.name} ${each.key}"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site[each.key].bucket_regional_domain_name
    origin_id                = "s3-${each.key}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site[each.key].id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${each.key}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # SPA fallback: send unknown routes to index.html (client-side routing).
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Bucket policy: allow ONLY this CloudFront distribution to read the bucket.
resource "aws_s3_bucket_policy" "site" {
  for_each = var.sites
  bucket   = aws_s3_bucket.site[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site[each.key].arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.site[each.key].arn
        }
      }
    }]
  })
}

output "cloudfront_urls" {
  description = "Public URL per web app."
  value       = { for k, d in aws_cloudfront_distribution.site : k => "https://${d.domain_name}" }
}

output "site_buckets" {
  description = "S3 bucket per web app (CI uploads here)."
  value       = { for k, b in aws_s3_bucket.site : k => b.id }
}

output "distribution_ids" {
  description = "CloudFront distribution ID per app (CI invalidates this)."
  value       = { for k, d in aws_cloudfront_distribution.site : k => d.id }
}
