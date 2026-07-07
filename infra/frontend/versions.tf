terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  backend "s3" {
    bucket         = "jahez-terraform-state-220719767281"
    key            = "frontend/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "jahez-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Stack       = "frontend"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "project" {
  type    = string
  default = "jahez"
}

variable "environment" {
  type    = string
  default = "dev"
}

# The three Next.js web apps. Each -> its own S3 bucket + CloudFront distribution.
variable "sites" {
  type    = set(string)
  default = ["client", "dashboard", "paneldashboard"]
}

data "aws_caller_identity" "current" {}
