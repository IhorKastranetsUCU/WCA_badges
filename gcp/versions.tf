terraform {
  required_version = ">= 1.10"

  # NOTE: Kept as local backend so `terraform init` and `terraform validate` run
  # cleanly without HCP Terraform / GCP credentials. When deploying live with HCP
  # Terraform, configure a separate workspace (isolated from AWS `infra/`):
  #
  # cloud {
  #   organization = "ooad-IhorKastranetsUCU"
  #   workspaces {
  #     name = "WCA_badges_gcp"
  #   }
  # }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
