# ─────────────────────────────────────────────────────────────────────────────
# Phase 0 — Bootstrap: Terraform remote state backend
#
# This creates the two AWS resources Terraform itself needs BEFORE it can manage
# anything else:
#   1. An S3 bucket  -> stores terraform.tfstate (the record of what exists)
#   2. A DynamoDB table -> a lock so two people can't run `apply` at once
#
# You run this ONCE, with a local state file. After it exists, every other
# Terraform stack points its backend at this bucket.
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "jahez"
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}

# Used to make the bucket name globally unique per AWS account.
data "aws_caller_identity" "current" {}

locals {
  state_bucket_name = "${var.project}-terraform-state-${data.aws_caller_identity.current.account_id}"
  lock_table_name   = "${var.project}-terraform-locks"
}

# ─── S3 bucket for state ─────────────────────────────────────────────────────
resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket_name

  # Safety: never let `terraform destroy` delete your state history by accident.
  lifecycle {
    prevent_destroy = true
  }
}

# Keep every version of the state file (lets you roll back a bad apply).
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt state at rest (it can contain secrets like the DB password).
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access to the state bucket.
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── DynamoDB table for state locking ────────────────────────────────────────
resource "aws_dynamodb_table" "locks" {
  name         = local.lock_table_name
  billing_mode = "PAY_PER_REQUEST" # no fixed cost, pay per lock (fractions of a cent)
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
