variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "eu-north-1"
}

variable "project" {
  description = "Project name prefix."
  type        = string
  default     = "jahez"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
  default     = "dev"
}

# ─── Networking ──────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread across."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Use ONE NAT gateway (cheaper, dev) vs one per AZ (HA, prod)."
  type        = bool
  default     = true
}

# ─── EKS ─────────────────────────────────────────────────────────────────────
variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster."
  type        = string
  default     = "1.31"
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS managed node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes."
  type        = number
  default     = 4
}

# ─── RDS PostgreSQL ──────────────────────────────────────────────────────────
variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "jahez_db"
}

variable "db_username" {
  description = "Master DB username."
  type        = string
  default     = "jahez_admin"
}

variable "db_instance_class" {
  description = "RDS instance size."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16.9"
}

# ─── ElastiCache Redis ───────────────────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache Redis node size."
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

# ─── Microservices ───────────────────────────────────────────────────────────
# Each gets its own ECR repository. Port used by k8s manifests / ALB target.
variable "microservices" {
  description = "Map of microservice name -> container port."
  type        = map(number)
  default = {
    "api-gateway"          = 3000
    "order-service"        = 3001
    "delivery-service"     = 3002
    "restaurant-service"   = 3003
    "auth-service"         = 3004
    "customer-service"     = 3005
    "manager-service"      = 3006
    "notification-service" = 3007
    "payment-service"      = 3008
  }
}
