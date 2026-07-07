output "state_bucket_name" {
  description = "Name of the S3 bucket that stores Terraform state. Use this in every other stack's backend config."
  value       = aws_s3_bucket.state.id
}

output "lock_table_name" {
  description = "Name of the DynamoDB table used for state locking."
  value       = aws_dynamodb_table.locks.name
}

output "aws_region" {
  description = "Region the backend lives in."
  value       = var.aws_region
}
