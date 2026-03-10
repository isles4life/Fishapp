terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — create this S3 bucket + DynamoDB table manually before first apply
  # or use `terraform init -backend=false` and migrate later
  backend "s3" {
    bucket         = "fishleague-tf-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fishleague-tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  name = "fishleague"
  tags = {
    Project     = "FishLeague"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
