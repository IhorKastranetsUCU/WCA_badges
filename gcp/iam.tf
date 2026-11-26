# Dedicated runtime service account for the Cloud Run API (never default compute SA, no JSON keys)
resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = "spry-api-runtime"
  display_name = "Spry Cloud Run API Runtime"
  description  = "Least-privilege service account used by the FastAPI Cloud Run service"

  depends_on = [google_project_service.enabled]
}

resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "api_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

# Dedicated service account for Terraform deployments via Workload Identity Federation
resource "google_service_account" "terraform_ci" {
  project      = var.project_id
  account_id   = "spry-terraform-ci"
  display_name = "Spry Terraform CI/CD"
  description  = "Service account impersonated by GitHub Actions / HCP Terraform via OIDC"

  depends_on = [google_project_service.enabled]
}

locals {
  terraform_roles = toset([
    "roles/run.admin",
    "roles/cloudsql.admin",
    "roles/artifactregistry.admin",
    "roles/secretmanager.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/iam.serviceAccountUser",
  ])
}

resource "google_project_iam_member" "terraform_ci_roles" {
  for_each = local.terraform_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_ci.email}"
}

# Optional keyless OIDC authentication for GitHub Actions (numeric IDs prevent repo-rename hijack)
resource "google_iam_workload_identity_pool" "github" {
  count = var.enable_wif ? 1 : 0

  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "OIDC identity pool for keyless CI deployments"

  depends_on = [google_project_service.enabled]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count = var.enable_wif ? 1 : 0

  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC Provider"

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
  }

  attribute_condition = "assertion.repository_owner_id == '${var.github_owner_id}' && assertion.repository_id == '${var.github_repository_id}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif_user" {
  count = var.enable_wif ? 1 : 0

  service_account_id = google_service_account.terraform_ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository_id/${var.github_repository_id}"
}
