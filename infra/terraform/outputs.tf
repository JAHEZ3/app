output "region" {
  value = var.aws_region
}

output "cluster_name" {
  description = "EKS cluster name. Use: aws eks update-kubeconfig --name <this> --region <region>"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  description = "Command to point kubectl at the cluster."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_repository_urls" {
  description = "ECR repo URL per microservice."
  value       = { for k, r in aws_ecr_repository.service : k => r.repository_url }
}

output "ecr_registry" {
  description = "ECR registry host (used by docker login / CI)."
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "alb_controller_role_arn" {
  description = "IRSA role ARN for the AWS Load Balancer Controller service account."
  value       = module.alb_controller_irsa.iam_role_arn
}

output "app_role_arn" {
  description = "IRSA role ARN for the jahez-app service account."
  value       = module.app_irsa.iam_role_arn
}

output "rds_endpoint" {
  value     = module.rds.db_instance_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive = true
}

output "app_secret_name" {
  description = "Secrets Manager secret holding all runtime env vars."
  value       = aws_secretsmanager_secret.app.name
}

output "uploads_bucket" {
  value = aws_s3_bucket.uploads.id
}
