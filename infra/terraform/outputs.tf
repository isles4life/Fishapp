output "backend_url" {
  description = "Backend API URL — set NEXT_PUBLIC_API_URL to this in GitHub secrets"
  value       = "http://${aws_lb.backend.dns_name}"
}

output "admin_url" {
  description = "Admin dashboard URL"
  value       = "http://${aws_lb.admin.dns_name}"
}

output "backend_ecr_url" {
  description = "Backend ECR repository URL — used by CI/CD"
  value       = aws_ecr_repository.backend.repository_url
}

output "admin_ecr_url" {
  description = "Admin ECR repository URL — used by CI/CD"
  value       = aws_ecr_repository.admin.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket for fish photo submissions"
  value       = aws_s3_bucket.submissions.bucket
}

output "ecs_cluster_name" {
  description = "ECS cluster name — used by CI/CD"
  value       = aws_ecs_cluster.main.name
}
