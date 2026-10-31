data "archive_file" "mailer_zip" {
  type        = "zip"
  source_file = "${path.module}/mailer/index.py"
  output_path = "${path.module}/mailer.zip"
}

# ==============================================================================
# 1. S3 Bucket & VPC Endpoint
# ==============================================================================

resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-reports-${var.account_id}"

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    id     = "DeleteReportsAfter90Days"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_notification" "reports" {
  bucket = aws_s3_bucket.reports.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.report_mailer.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "reports/"
    filter_suffix       = ".csv"
  }

  depends_on = [aws_lambda_permission.report_mailer_s3]
}

resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [var.route_table_id]

  tags = {
    PROJECT_NAME = var.project_name
  }
}

# ==============================================================================
# 2. SQS Queue & DLQ
# ==============================================================================

resource "aws_sqs_queue" "report_requests_dlq" {
  name                      = "${var.project_name}-report-requests-dlq"
  message_retention_seconds = 1209600

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_sqs_queue" "report_requests_queue" {
  name                       = "${var.project_name}-report-requests"
  visibility_timeout_seconds = 360
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.report_requests_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    PROJECT_NAME = var.project_name
  }
}

# ==============================================================================
# 3. Security Groups & IAM Roles
# ==============================================================================

resource "aws_security_group" "lambda_sg" {
  description = "Security group for Builder Lambda in VPC"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_iam_role" "builder_execution_role" {
  name = "${var.project_name}-report-builder-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "builder_basic" {
  role       = aws_iam_role.builder_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "builder_vpc" {
  role       = aws_iam_role.builder_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "builder_s3_sqs" {
  name = "S3AndSqsAccess"
  role = aws_iam_role.builder_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::${var.project_name}-reports-${var.account_id}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.report_requests_queue.arn
      }
    ]
  })
}

resource "aws_iam_role" "mailer_execution_role" {
  name = "${var.project_name}-report-mailer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "mailer_basic" {
  role       = aws_iam_role.mailer_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "mailer_permissions" {
  name = "MailerPermissions"
  role = aws_iam_role.mailer_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${var.project_name}-reports-${var.account_id}/reports/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "scheduler_role" {
  name = "${var.project_name}-reports-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
    }]
  })

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_iam_role_policy" "scheduler_sqs" {
  name = "SqsSendMessage"
  role = aws_iam_role.scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.report_requests_queue.arn
    }]
  })
}

# ==============================================================================
# 4. Lambda Functions & Triggers
# ==============================================================================

resource "aws_lambda_function" "report_builder" {
  function_name = "${var.project_name}-report-builder"
  description   = "Spry weekly report builder running inside VPC"
  package_type  = "Image"
  image_uri     = var.image_uri
  role          = aws_iam_role.builder_execution_role.arn
  timeout       = 60
  memory_size   = 1024

  image_config {
    command = ["app.reports.lambda_handler.handler"]
  }

  environment {
    variables = {
      REPORTS_BUCKET_NAME = "${var.project_name}-reports-${var.account_id}"
      PROJECT_NAME        = var.project_name
      AWS_ACCOUNT_ID      = var.account_id
    }
  }

  vpc_config {
    security_group_ids = [aws_security_group.lambda_sg.id]
    subnet_ids         = var.subnet_ids
  }

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_lambda_event_source_mapping" "report_builder_sqs" {
  event_source_arn = aws_sqs_queue.report_requests_queue.arn
  function_name    = aws_lambda_function.report_builder.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_function" "report_mailer" {
  function_name    = "${var.project_name}-report-mailer"
  description      = "Spry report mailer running outside VPC with SES access"
  runtime          = "python3.12"
  handler          = "index.handler"
  role             = aws_iam_role.mailer_execution_role.arn
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.mailer_zip.output_path
  source_code_hash = data.archive_file.mailer_zip.output_base64sha256

  environment {
    variables = {
      SENDER_EMAIL     = var.sender_email
      RECIPIENT_EMAILS = var.recipient_email
    }
  }

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_lambda_permission" "report_mailer_s3" {
  statement_id   = "wca-badges-reports-ReportMailerS3Permission-kGH2Nz3BrkOk"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.report_mailer.function_name
  principal      = "s3.amazonaws.com"
  source_arn     = "arn:aws:s3:::${var.project_name}-reports-${var.account_id}"
  source_account = var.account_id
}

# ==============================================================================
# 5. EventBridge Scheduler
# ==============================================================================

resource "aws_scheduler_schedule" "weekly_report" {
  name                         = "${var.project_name}-weekly-report-schedule"
  description                  = "Dispatches weekly report generation command to SQS every Monday at 07:00 Europe/Kyiv"
  schedule_expression          = "cron(0 7 ? * MON *)"
  schedule_expression_timezone = "Europe/Kyiv"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_sqs_queue.report_requests_queue.arn
    role_arn = aws_iam_role.scheduler_role.arn
    input    = jsonencode({ week = null, source = "schedule" })
  }
}
