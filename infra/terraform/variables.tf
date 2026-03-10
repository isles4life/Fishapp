variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Postgres master password (stored in Secrets Manager)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "apple_bundle_id" {
  description = "iOS app bundle ID for Apple Sign In"
  type        = string
  default     = "com.yourcompany.fishleague"
}

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "backend_cpu" {
  description = "ECS task CPU units for backend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "ECS task memory (MB) for backend"
  type        = number
  default     = 512
}

variable "admin_cpu" {
  description = "ECS task CPU units for admin"
  type        = number
  default     = 256
}

variable "admin_memory" {
  description = "ECS task memory (MB) for admin"
  type        = number
  default     = 512
}
