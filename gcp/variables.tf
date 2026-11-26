variable "project_id" {
  type        = string
  description = "Globally unique Google Cloud Project ID"
  default     = "spry-kastranets-2026"
}

variable "region" {
  type        = string
  description = "Primary GCP region for Cloud Run, Cloud SQL, and Artifact Registry"
  default     = "us-central1"
}

variable "project_name" {
  type        = string
  description = "Logical application name prefix for GCP resources"
  default     = "wca-badges"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine tier (smallest shared-core: db-f1-micro)"
  default     = "db-f1-micro"
}

variable "db_disk_size_gb" {
  type        = number
  description = "Cloud SQL SSD disk size in GB (10 GB minimum)"
  default     = 10
}

variable "db_activation_policy" {
  type        = string
  description = "ALWAYS to run Cloud SQL, NEVER to stop the instance and save compute charges"
  default     = "ALWAYS"

  validation {
    condition     = contains(["ALWAYS", "NEVER"], var.db_activation_policy)
    error_message = "db_activation_policy must be ALWAYS or NEVER."
  }
}

variable "db_name" {
  type        = string
  description = "PostgreSQL database name"
  default     = "spry_badges"
}

variable "db_user" {
  type        = string
  description = "PostgreSQL application user"
  default     = "spry_user"
}

variable "api_image" {
  type        = string
  description = "Artifact Registry OCI image URI for the FastAPI Cloud Run service"
  default     = "us-central1-docker.pkg.dev/spry-kastranets-2026/wca-badges-repo/wca-badges-backend:latest"
}

variable "cors_origins" {
  type        = string
  description = "Comma-separated allowed CORS origins for Cloud Run API"
  default     = "https://spry-kastranets-2026.web.app,https://spry-kastranets-2026.firebaseapp.com,http://localhost:5173"
}

variable "enable_wif" {
  type        = bool
  description = "Enable Workload Identity Federation resources for keyless GitHub Actions deployment"
  default     = false
}

variable "github_repository_id" {
  type        = string
  description = "Numeric GitHub repository ID for WIF attribute condition"
  default     = ""
}

variable "github_owner_id" {
  type        = string
  description = "Numeric GitHub owner ID for WIF attribute condition"
  default     = ""
}
