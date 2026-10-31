resource "aws_cognito_user_pool" "user_pool" {
  name                     = "${var.project_name}-user-pool"
  user_pool_tier           = "ESSENTIALS"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    PROJECT_NAME = var.project_name
  }
}

resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" && var.google_client_secret != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.user_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    name           = "name"
    picture        = "picture"
  }

  lifecycle {
    ignore_changes = [provider_details, attribute_mapping]
  }
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  name                                 = "${var.project_name}-spa-client"
  user_pool_id                         = aws_cognito_user_pool.user_pool.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  allowed_oauth_flows  = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]

  supported_identity_providers = var.google_client_id != "" && var.google_client_secret != "" ? ["COGNITO", "Google"] : ["COGNITO"]

  callback_urls = [
    "${var.frontend_url}/",
    "${var.frontend_url}/login/",
    "${var.frontend_url}/login",
    "http://localhost:${var.localhost_port}/",
    "http://localhost:${var.localhost_port}/login/",
    "http://localhost:${var.localhost_port}/login"
  ]

  logout_urls = [
    "${var.frontend_url}/",
    "http://localhost:${var.localhost_port}/"
  ]

  lifecycle {
    ignore_changes = [generate_secret]
  }

  depends_on = [aws_cognito_identity_provider.google]
}

resource "aws_cognito_user_pool_domain" "user_pool_domain" {
  domain                = var.cognito_domain_prefix
  user_pool_id          = aws_cognito_user_pool.user_pool.id
  managed_login_version = 2
}

resource "aws_cognito_managed_login_branding" "managed_login_branding" {
  user_pool_id                = aws_cognito_user_pool.user_pool.id
  client_id                   = aws_cognito_user_pool_client.user_pool_client.id
  use_cognito_provided_values = true

  depends_on = [
    aws_cognito_user_pool_domain.user_pool_domain,
    aws_cognito_user_pool_client.user_pool_client
  ]
}
