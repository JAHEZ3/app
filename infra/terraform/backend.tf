# Remote state -> the S3 bucket + DynamoDB lock created in Phase 0 (infra/bootstrap).
terraform {
  backend "s3" {
    bucket         = "jahez-terraform-state-220719767281"
    key            = "core/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "jahez-terraform-locks"
    encrypt        = true
  }
}
