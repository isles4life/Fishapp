resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}/backend"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/ecs/${local.name}/admin"
  retention_in_days = 30
  tags              = local.tags
}

# ── Backend task definition ────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",        value = "production" },
      { name = "PORT",            value = "3000" },
      { name = "AWS_REGION",      value = var.aws_region },
      { name = "S3_BUCKET",       value = aws_s3_bucket.submissions.bucket },
      { name = "APPLE_BUNDLE_ID", value = var.apple_bundle_id },
      { name = "ALLOWED_ORIGINS", value = "https://admin.fishleague.app,https://fishleague.app,https://www.fishleague.app,null" },
    ]

    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = aws_secretsmanager_secret.db_url.arn
      },
      {
        name      = "JWT_SECRET"
        valueFrom = aws_secretsmanager_secret.jwt_secret.arn
      },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }

    essential = true
  }])

  tags = local.tags
}

# ── Admin task definition ──────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "admin" {
  family                   = "${local.name}-admin"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.admin_cpu
  memory                   = var.admin_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "admin"
    image = "${aws_ecr_repository.admin.repository_url}:latest"

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT",     value = "3001" },
      # NEXT_PUBLIC_* vars are baked in at image build time — see Dockerfile ARGs
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.admin.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }

    essential = true
  }])

  tags = local.tags
}

# ── Backend ECS service ────────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.backend_https]
  tags       = local.tags

  lifecycle {
    ignore_changes = [task_definition] # CI/CD updates this
  }
}

# ── Admin ECS service ──────────────────────────────────────────────────────────
resource "aws_ecs_service" "admin" {
  name            = "${local.name}-admin"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.admin.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.admin.arn
    container_name   = "admin"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.admin_https]
  tags       = local.tags

  lifecycle {
    ignore_changes = [task_definition] # CI/CD updates this
  }
}
