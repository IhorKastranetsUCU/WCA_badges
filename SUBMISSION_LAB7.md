# Lab 7: The Cloud as Code: from CloudFormation to Terraform ☁️🏗️
## Spry Architecture Lab Submission & Verification Report

**Student:** Ihor Kastranets (`kastranets.pn@ucu.edu.ua`)  
**AWS Account ID:** `297580066889`  
**Region:** `us-east-1`  
**Project:** `wca-badges` (Spry)  
**HCP Terraform Organization:** `ooad-IhorKastranetsUCU`  
**HCP Terraform Workspace:** [`WCA_badges`](https://app.terraform.io/app/ooad-IhorKastranetsUCU/workspaces/WCA_badges) (ID: `ws-QYUzieF8iNNMPvWX`)  
**Deployed Frontend:** [https://d3genjzo563rwc.cloudfront.net](https://d3genjzo563rwc.cloudfront.net)  

---

## What to Submit — 3 Required Deliverables

### 1. Deliverable 1: Link to Commit
👉 **Primary Migration Commit:** **[GitHub Commit c273d05](https://github.com/IhorKastranetsUCU/WCA_badges/commit/c273d05)**  
👉 **Refactoring Commit (Standalone IAM Policies without Warnings):** **[GitHub Commit 3d9d03a](https://github.com/IhorKastranetsUCU/WCA_badges/commit/3d9d03a)**  
*(Full Lab 7 commit range on GitHub: [`4250bac..3d9d03a`](https://github.com/IhorKastranetsUCU/WCA_badges/compare/4250bac...3d9d03a))*

#### Summary of Commit Changes:
1. **Replaced 3 CloudFormation templates with Terraform HCL under `infra/`:**
   - Deleted: `infra/auth.yml`, `infra/reports.yml`, `infra/ai.yml`.
   - Created:
     - `infra/versions.tf` — Terraform `>= 1.10`, `cloud` backend with organization `ooad-IhorKastranetsUCU` and workspace `WCA_badges`, AWS provider `~> 6.0`.
     - `infra/variables.tf` — Variable declarations for account, region, network, domains, models, and sensitive parameters.
     - `infra/terraform.tfvars` — Non-secret project values.
     - `infra/auth.tf` — Cognito User Pool, Managed Login v2 branding, Hosted Domain, SPA client, Google IdP.
     - `infra/reports.tf` — S3 reports bucket (90-day lifecycle), SQS + DLQ, Builder Lambda (inside VPC), Mailer Lambda (outside VPC with SES), EventBridge Scheduler.
     - `infra/ai.tf` — Bedrock Agenda Parser Lambda, public Function URL with CORS, IAM inference policy.
     - `infra/outputs.tf` — All infrastructure values consumed by the application, Makefile, and frontend.
2. **Updated `Makefile`:**
   - Strictly **no `terraform apply`** in the Makefile.
   - Added target `make infra-plan` which streams speculative execution plans directly from HCP Terraform.
   - Targets reading infrastructure outputs (e.g., `report-now`) read them from `terraform output -raw <Key>`.
   - Replaced old CloudFormation deployment targets (`aws-deploy-auth`, `aws-deploy-reports`, `aws-deploy-ai`) with guidance pointing to `make infra-plan` and VCS push.
3. **Updated `README.md`:**
   - Added Section 7 detailing the Infrastructure as Code architecture, division of responsibilities (Terraform for application stacks vs CloudFormation for base VPC/backend/frontend), VCS-driven CI/CD workflow, and sensitive variable handling.
4. **Added Architecture Decision Record (ADR):**
   - Added `docs/adr/0008-terraform-migration.md` documenting context, decision, alternatives (CloudFormation, CDK, OpenTofu), operational consequences, secrets boundaries, and HCP outage resilience.

---

### 2. Deliverable 2: Screenshot of HCP Terraform Run (Apply Finished)

The screenshot shows an HCP Terraform run that finished with **`Applied` (`Apply finished`)**, triggered automatically by a **GitHub push to `main`**, not from a local laptop:

![HCP Terraform Apply Finished](hcp_terraform_apply_finished.jpg)

- **HCP Terraform Workspace:** `ooad-IhorKastranetsUCU / WCA_badges` (Workspace ID: `ws-QYUzieF8iNNMPvWX`)
- **Run URL:** [https://app.terraform.io/app/ooad-IhorKastranetsUCU/workspaces/WCA_badges/runs/run-d5Mnx2BbzuB8fVFz](https://app.terraform.io/app/ooad-IhorKastranetsUCU/workspaces/WCA_badges/runs/run-d5Mnx2BbzuB8fVFz)  
  *(Initial Migration Run: [run-fhXJjwqFECHw9TQa](https://app.terraform.io/app/ooad-IhorKastranetsUCU/workspaces/WCA_badges/runs/run-fhXJjwqFECHw9TQa))*
- **Trigger Source:** `IhorKastranetsUCU triggered a run from GitHub`
- **Status:** **`Applied`**
- **Plan Finished:** `Resources: 8 to add, 0 to change, 0 to destroy`
- **Apply Finished:** `Resources: 8 added, 0 changed, 0 destroyed` (Total managed resources: **34**)
- **State Version:** Updated remotely in HCP Terraform with automatic state locking.
- **Image File in Repository:** `labs/lab7/hcp_terraform_apply_finished.jpg` (and `deliverable_2_hcp_apply.jpg`)

---

### 3. Deliverable 3: Output of `terraform plan` Right After Migration

Verbatim terminal output of `terraform plan` executed against the HCP Terraform remote workspace, demonstrating complete drift convergence and zero remaining changes:

```text
Running plan in HCP Terraform. Output will stream here. Pressing Ctrl-C
will stop streaming the logs, but will not stop the plan running remotely.

Preparing the remote plan...

The remote workspace is configured to work with configuration at
infra relative to the target repository.

To view this run in a browser, visit:
https://app.terraform.io/app/ooad-IhorKastranetsUCU/WCA_badges/runs/run-DhHMhNBA6NtKb1eS

Waiting for the plan to start...

Terraform v1.17.1
on linux_amd64

Initializing plugins and modules...
data.archive_file.mailer_zip: Refreshing...
data.archive_file.mailer_zip: Refresh complete after 0s [id=f0129545ab74fcda02202547a50ba596ec88c83f]
aws_iam_role.mailer_execution_role: Refreshing state... [id=wca-badges-report-mailer-role]
aws_iam_role.builder_execution_role: Refreshing state... [id=wca-badges-report-builder-role]
aws_vpc_endpoint.s3_gateway: Refreshing state... [id=vpce-01a4fd463d56e3d14]
aws_s3_bucket.reports: Refreshing state... [id=wca-badges-reports-297580066889]
aws_iam_role.scheduler_role: Refreshing state... [id=wca-badges-reports-scheduler-role]
aws_iam_role.agenda_parser_role: Refreshing state... [id=wca-badges-agenda-parser-role]
aws_sqs_queue.report_requests_dlq: Refreshing state... [id=https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests-dlq]
aws_cognito_user_pool.user_pool: Refreshing state... [id=us-east-1_T7FaZwE2p]
aws_security_group.lambda_sg: Refreshing state... [id=sg-0034a9f17eef65259]
aws_sqs_queue.report_requests_queue: Refreshing state... [id=https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests]
aws_iam_role_policy.mailer_permissions: Refreshing state... [id=wca-badges-report-mailer-role:MailerPermissions]
aws_iam_role_policy_attachment.mailer_basic: Refreshing state... [id=wca-badges-report-mailer-role/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]
aws_lambda_function.report_mailer: Refreshing state... [id=wca-badges-report-mailer]
aws_iam_role_policy.builder_s3_sqs: Refreshing state... [id=wca-badges-report-builder-role:S3AndSqsAccess]
aws_scheduler_schedule.weekly_report: Refreshing state... [id=default/wca-badges-weekly-report-schedule]
aws_lambda_function.report_builder: Refreshing state... [id=wca-badges-report-builder]
aws_iam_role_policy_attachment.builder_vpc: Refreshing state... [id=wca-badges-report-builder-role/arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole]
aws_iam_role_policy.scheduler_sqs: Refreshing state... [id=wca-badges-reports-scheduler-role:SqsSendMessage]
aws_iam_role_policy_attachment.builder_basic: Refreshing state... [id=wca-badges-report-builder-role/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]
aws_iam_role_policy.agenda_parser_bedrock: Refreshing state... [id=wca-badges-agenda-parser-role:BedrockInferencePolicy]
aws_iam_role_policy_attachment.agenda_parser_basic: Refreshing state... [id=wca-badges-agenda-parser-role/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]
aws_cognito_identity_provider.google[0]: Refreshing state... [id=us-east-1_T7FaZwE2p:Google]
aws_cognito_user_pool_domain.user_pool_domain: Refreshing state... [id=wca-badges-297580066889]
aws_lambda_function.agenda_parser: Refreshing state... [id=wca-badges-agenda-parser]
aws_cognito_user_pool_client.user_pool_client: Refreshing state... [id=3eqs900kmd3koe333lg6jl4pl2]
aws_s3_bucket_public_access_block.reports: Refreshing state... [id=wca-badges-reports-297580066889]
aws_s3_bucket_lifecycle_configuration.reports: Refreshing state... [id=wca-badges-reports-297580066889]
aws_lambda_event_source_mapping.report_builder_sqs: Refreshing state... [id=0a1a96ec-8551-40f6-8ffb-e0655a1e2d17]
aws_lambda_permission.report_mailer_s3: Refreshing state... [id=wca-badges-reports-ReportMailerS3Permission-kGH2Nz3BrkOk]
aws_lambda_permission.agenda_parser_url_permission: Refreshing state... [id=wca-badges-ai-AgendaParserUrlPermission-9Of2TAdYE2DD]
aws_lambda_function_url.agenda_parser_url: Refreshing state... [id=wca-badges-agenda-parser]
aws_s3_bucket_notification.reports: Refreshing state... [id=wca-badges-reports-297580066889]
aws_cognito_managed_login_branding.managed_login_branding: Refreshing state...

No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration and
found no differences, so no changes are needed.
```

---

## Architectural Highlights & Migration Safeguards

### 1. Zero-Loss Resource Adoption (`Retain` + `import`)
- To guarantee zero downtime and prevent destruction of live production data (Cognito user pool, reports S3 bucket history), `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` were applied to all resources in CloudFormation prior to deleting the stacks.
- Once stack metadata was dropped from AWS CloudFormation, resources remained active and were seamlessly imported into Terraform state via `import` blocks.
- The initial migration plan produced `25 to import, 0 to destroy`, strictly respecting the zero-destruction mandate.

### 2. Dynamic AWS Authentication via IAM OIDC (No Static Keys)
- Bootstrap infrastructure (`~/tf-bootstrap`) configured an **IAM OIDC Identity Provider** for `https://app.terraform.io` and created IAM role `hcp-terraform-ooad-IhorKastranetsUCU` (`arn:aws:iam::297580066889:role/hcp-terraform-ooad-IhorKastranetsUCU`).
- Workspace environment variables:
  - `TFC_AWS_PROVIDER_AUTH = true`
  - `TFC_AWS_RUN_ROLE_ARN = arn:aws:iam::297580066889:role/hcp-terraform-ooad-IhorKastranetsUCU`
- Every run automatically acquires temporary, short-lived STS credentials scoped exclusively to the workspace run phase.

### 3. Strict Secrets Hygiene
- `gemini_api_key` and `google_client_secret` are defined as sensitive variables in HCP Terraform and marked write-only.
- Non-secret defaults reside in `infra/variables.tf` and `infra/terraform.tfvars`.
- No plain-text secrets or state files exist in version control.
