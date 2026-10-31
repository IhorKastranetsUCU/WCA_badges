# ==============================================================================
# Step 3b — Imports for Zero-Loss Adoption
# ==============================================================================

# Auth resources
import {
  to = aws_cognito_user_pool.user_pool
  id = "us-east-1_T7FaZwE2p"
}

import {
  to = aws_cognito_identity_provider.google[0]
  id = "us-east-1_T7FaZwE2p:Google"
}

import {
  to = aws_cognito_user_pool_client.user_pool_client
  id = "us-east-1_T7FaZwE2p/3eqs900kmd3koe333lg6jl4pl2"
}

import {
  to = aws_cognito_user_pool_domain.user_pool_domain
  id = "wca-badges-297580066889"
}

import {
  to = aws_cognito_managed_login_branding.managed_login_branding
  id = "us-east-1_T7FaZwE2p,7fef19cc-92a9-402c-9823-35a86480aebb"
}

# Reports resources
import {
  to = aws_s3_bucket.reports
  id = "wca-badges-reports-297580066889"
}

import {
  to = aws_s3_bucket_public_access_block.reports
  id = "wca-badges-reports-297580066889"
}

import {
  to = aws_s3_bucket_lifecycle_configuration.reports
  id = "wca-badges-reports-297580066889"
}

import {
  to = aws_s3_bucket_notification.reports
  id = "wca-badges-reports-297580066889"
}

import {
  to = aws_vpc_endpoint.s3_gateway
  id = "vpce-01a4fd463d56e3d14"
}

import {
  to = aws_sqs_queue.report_requests_dlq
  id = "https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests-dlq"
}

import {
  to = aws_sqs_queue.report_requests_queue
  id = "https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests"
}

import {
  to = aws_security_group.lambda_sg
  id = "sg-0034a9f17eef65259"
}

import {
  to = aws_iam_role.builder_execution_role
  id = "wca-badges-report-builder-role"
}

import {
  to = aws_iam_role.mailer_execution_role
  id = "wca-badges-report-mailer-role"
}

import {
  to = aws_iam_role.scheduler_role
  id = "wca-badges-reports-scheduler-role"
}

import {
  to = aws_lambda_function.report_builder
  id = "wca-badges-report-builder"
}

import {
  to = aws_lambda_event_source_mapping.report_builder_sqs
  id = "0a1a96ec-8551-40f6-8ffb-e0655a1e2d17"
}

import {
  to = aws_lambda_function.report_mailer
  id = "wca-badges-report-mailer"
}

import {
  to = aws_lambda_permission.report_mailer_s3
  id = "wca-badges-report-mailer/wca-badges-reports-ReportMailerS3Permission-kGH2Nz3BrkOk"
}

import {
  to = aws_scheduler_schedule.weekly_report
  id = "default/wca-badges-weekly-report-schedule"
}

# AI resources
import {
  to = aws_iam_role.agenda_parser_role
  id = "wca-badges-agenda-parser-role"
}

import {
  to = aws_lambda_function.agenda_parser
  id = "wca-badges-agenda-parser"
}

import {
  to = aws_lambda_function_url.agenda_parser_url
  id = "wca-badges-agenda-parser"
}

import {
  to = aws_lambda_permission.agenda_parser_url_permission
  id = "wca-badges-agenda-parser/wca-badges-ai-AgendaParserUrlPermission-9Of2TAdYE2DD"
}
