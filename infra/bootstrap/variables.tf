variable "aws_region" {
  description = "AWS region to create the state backend in."
  type        = string
  default     = "eu-north-1"
}

variable "project" {
  description = "Short project name, used as a prefix for resource names."
  type        = string
  default     = "jahez"
}
