resource "aws_security_group" "redis" {
  name_prefix = "${local.name}-redis-"
  description = "Allow Redis from within the VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Redis from VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis"
  subnet_ids = module.vpc.private_subnets
  tags       = local.tags
}

# BullMQ requires maxmemory-policy=noeviction so queued jobs are never evicted.
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${local.name}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }

  tags = local.tags
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name}-redis"
  description          = "Redis for Jahez (cache + BullMQ queues)"

  engine         = "redis"
  engine_version = var.redis_engine_version
  node_type      = var.redis_node_type
  port           = 6379

  num_cache_clusters         = 1
  automatic_failover_enabled = false

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  # transit encryption off to keep the client config simple in dev.
  transit_encryption_enabled = false

  tags = local.tags
}
