resource "aws_s3_bucket" "submissions" {
  bucket        = "${local.name}-submissions-${var.environment}"
  force_destroy = false
  tags          = local.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "submissions" {
  bucket                  = aws_s3_bucket.submissions.id
  block_public_acls       = true
  block_public_policy     = false  # allow bucket policy below
  ignore_public_acls      = true
  restrict_public_buckets = false  # allow public reads via policy
}

# Allow public GET on avatars/ prefix only — fish photos stay private
resource "aws_s3_bucket_policy" "submissions" {
  bucket     = aws_s3_bucket.submissions.id
  depends_on = [aws_s3_bucket_public_access_block.submissions]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadAvatars"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.submissions.arn}/avatars/*"
    }]
  })
}

resource "aws_s3_bucket_versioning" "submissions" {
  bucket = aws_s3_bucket.submissions.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
