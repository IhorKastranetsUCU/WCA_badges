variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name tag"
  default     = "wca-badges"
}

variable "account_id" {
  type        = string
  description = "AWS Account ID"
  default     = "297580066889"
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Unique prefix for Cognito hosted domain"
  default     = "wca-badges-297580066889"
}

variable "google_client_id" {
  type        = string
  description = "Google OAuth 2.0 Client ID"
  default     = "794609556919-iq3gif75o82363prudfbiqlj44j09slj.apps.googleusercontent.com"
}

variable "google_client_secret" {
  type        = string
  description = "Google OAuth 2.0 Client Secret"
  sensitive   = true
  default     = ""
}

variable "frontend_url" {
  type        = string
  description = "Base URL of deployed frontend"
  default     = "https://d3genjzo563rwc.cloudfront.net"
}

variable "localhost_port" {
  type        = number
  description = "Local development port"
  default     = 5173
}

variable "image_uri" {
  type        = string
  description = "ECR Docker Image URI for Lambda functions"
  default     = "297580066889.dkr.ecr.us-east-1.amazonaws.com/wca-badges-backend:latest"
}

variable "sender_email" {
  type        = string
  description = "Verified SES sender email"
  default     = "kastranets.pn@ucu.edu.ua"
}

variable "recipient_email" {
  type        = string
  description = "Verified SES recipient email"
  default     = "kastranets.pn@ucu.edu.ua"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where Builder Lambda resides"
  default     = "vpc-0505d891aeb907a09"
}

variable "route_table_id" {
  type        = string
  description = "Route table ID for S3 Gateway VPC Endpoint"
  default     = "rtb-0f6c8a00be5ec6ea6"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnets for Builder Lambda VPC configuration"
  default     = ["subnet-0897a06b2403b2f3a", "subnet-0a8786bfa162ecd38"]
}

variable "parser_model" {
  type        = string
  description = "Amazon Bedrock model ID for agenda parsing"
  default     = "anthropic.claude-opus-5-5"
}

variable "layout_model" {
  type        = string
  description = "Vision model ID for layout"
  default     = "gemini-3.5-flash"
}

variable "gemini_api_key" {
  type        = string
  description = "Gemini API key"
  sensitive   = true
  default     = ""
}
