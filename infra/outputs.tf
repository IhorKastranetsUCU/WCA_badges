# Auth Outputs
output "UserPoolId" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.user_pool.id
}

output "UserPoolClientId" {
  description = "The ID of the Cognito App Client (Public SPA)"
  value       = aws_cognito_user_pool_client.user_pool_client.id
}

output "CognitoDomain" {
  description = "Hosted Cognito Domain for Managed Login"
  value       = "https://${var.cognito_domain_prefix}.auth.${var.region}.amazoncognito.com"
}

output "CognitoIssuerUrl" {
  description = "The OIDC Authority URL"
  value       = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.user_pool.id}"
}

output "LoginUrl" {
  description = "Direct link to Cognito Managed Login"
  value       = "https://${var.cognito_domain_prefix}.auth.${var.region}.amazoncognito.com/login?client_id=${aws_cognito_user_pool_client.user_pool_client.id}&response_type=code&scope=openid+email+profile&redirect_uri=${var.frontend_url}/"
}

# Reports Outputs
output "ReportsBucketName" {
  description = "S3 bucket for storing weekly reports"
  value       = aws_s3_bucket.reports.bucket
}

output "ReportRequestsQueueUrl" {
  description = "SQS Queue URL for requesting reports"
  value       = aws_sqs_queue.report_requests_queue.id
}

output "ReportRequestsDlqUrl" {
  description = "SQS Dead-Letter Queue URL"
  value       = aws_sqs_queue.report_requests_dlq.id
}

output "ReportBuilderFunctionName" {
  description = "Builder Lambda function name"
  value       = aws_lambda_function.report_builder.function_name
}

output "ReportMailerFunctionName" {
  description = "Mailer Lambda function name"
  value       = aws_lambda_function.report_mailer.function_name
}

# AI Outputs
output "AgendaParserFunctionArn" {
  description = "ARN of the Agenda Parser Lambda function"
  value       = aws_lambda_function.agenda_parser.arn
}

output "AgendaParserUrl" {
  description = "Public Function URL for the Agenda Parser"
  value       = aws_lambda_function_url.agenda_parser_url.function_url
}
