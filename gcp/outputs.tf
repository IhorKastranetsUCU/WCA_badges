output "cloud_run_url" {
  description = "HTTPS URL of the Cloud Run FastAPI service"
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL Unix socket connection name mounted at /cloudsql"
  value       = google_sql_database_instance.postgres.connection_name
}

output "artifact_registry_repository" {
  description = "Docker image repository path in Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

output "api_service_account_email" {
  description = "Runtime service account email for Cloud Run"
  value       = google_service_account.api_runtime.email
}

output "db_password_secret_id" {
  description = "Secret Manager secret ID holding the generated Cloud SQL password"
  value       = google_secret_manager_secret.db_password.secret_id
}
