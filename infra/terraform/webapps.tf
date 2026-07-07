# ECR repository per Next.js web app (client, dashboard, paneldashboard).
resource "aws_ecr_repository" "web" {
  for_each = var.web_apps

  name                 = "${var.project}/web-${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

resource "aws_ecr_lifecycle_policy" "web" {
  for_each   = aws_ecr_repository.web
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 20 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}

output "web_ecr_repository_urls" {
  description = "ECR repo URL per web app."
  value       = { for k, r in aws_ecr_repository.web : k => r.repository_url }
}
