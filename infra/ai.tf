# ==============================================================================
# 1. IAM Execution Role for Agenda Parser Lambda
# ==============================================================================

resource "aws_iam_role" "agenda_parser_role" {
  name = "${var.project_name}-agenda-parser-role"

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

resource "aws_iam_role_policy_attachment" "agenda_parser_basic" {
  role       = aws_iam_role.agenda_parser_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "agenda_parser_bedrock" {
  name = "BedrockInferencePolicy"
  role = aws_iam_role.agenda_parser_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock-mantle:CreateInference",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock-runtime:Converse"
      ]
      Resource = "*"
    }]
  })
}

# ==============================================================================
# 2. Agenda Parser Lambda Function
# ==============================================================================

resource "aws_lambda_function" "agenda_parser" {
  function_name = "${var.project_name}-agenda-parser"
  description   = "Parses unstructured text into structured meeting agendas using Amazon Bedrock"
  package_type  = "Image"
  image_uri     = var.image_uri
  role          = aws_iam_role.agenda_parser_role.arn
  timeout       = 30
  memory_size   = 512

  image_config {
    command = ["app.ai.agenda_lambda.handler"]
  }

  environment {
    variables = {
      ENVIRONMENT          = "production"
      PROJECT_NAME         = var.project_name
      PARSER_MODEL         = var.parser_model
      LAYOUT_MODEL         = var.layout_model
      GEMINI_MODEL         = var.layout_model
      GEMINI_API_KEY       = var.gemini_api_key
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.user_pool.id
      COGNITO_REGION       = var.region
      CORS_ORIGINS         = "${var.frontend_url},http://localhost:5173,*"
    }
  }

  tags = {
    PROJECT_NAME = var.project_name
  }
}

# ==============================================================================
# 3. Public Lambda Function URL & Invoke Permission
# ==============================================================================

resource "aws_lambda_function_url" "agenda_parser_url" {
  function_name      = aws_lambda_function.agenda_parser.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
    max_age       = 86400
  }
}

resource "aws_lambda_permission" "agenda_parser_url_permission" {
  statement_id           = "wca-badges-ai-AgendaParserUrlPermission-9Of2TAdYE2DD"
  function_name          = aws_lambda_function.agenda_parser.function_name
  action                 = "lambda:InvokeFunctionUrl"
  principal              = "*"
  function_url_auth_type = "NONE"
}
