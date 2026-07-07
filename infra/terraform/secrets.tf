# ─── Auto-generated secrets (never written to code or git) ───────────────────
resource "random_password" "db" {
  length  = 24
  special = false # keep RDS/URL friendly
}

resource "random_password" "jwt" {
  length  = 48
  special = true
}

# One Secrets Manager secret holding everything the services need at runtime.
# Pods read this via the IRSA role (module.app_irsa), or CI injects it as env.
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  description             = "Runtime secrets for Jahez microservices."
  recovery_window_in_days = 0 # allow immediate recreate in dev

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DB_HOST     = module.rds.db_instance_address
    DB_PORT     = tostring(module.rds.db_instance_port)
    DB_USER     = var.db_username
    DB_PASSWORD = random_password.db.result
    DB_NAME     = var.db_name
    DATABASE_URL = "postgresql://${var.db_username}:${random_password.db.result}@${module.rds.db_instance_endpoint}/${var.db_name}"

    REDIS_HOST = aws_elasticache_replication_group.redis.primary_endpoint_address
    REDIS_PORT = "6379"

    NATS_URL = "nats://nats.jahez.svc.cluster.local:4222"

    JWT_SECRET = random_password.jwt.result

    AWS_S3_BUCKET = aws_s3_bucket.uploads.id
    AWS_REGION    = var.aws_region
  })
}
