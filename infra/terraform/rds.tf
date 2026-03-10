resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
  tags       = local.tags
}

resource "aws_db_instance" "postgres" {
  identifier        = "${local.name}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "fishleague"
  username = "fishleague"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # MVP: single AZ. Set multi_az = true for HA
  multi_az            = false
  publicly_accessible = false

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.name}-final-snapshot"

  deletion_protection = true

  tags = merge(local.tags, { Name = "${local.name}-postgres" })
}
