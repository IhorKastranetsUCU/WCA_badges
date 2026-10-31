# Lab 7. The cloud as code: from CloudFormation to Terraform

- **Course:** Об'єктно-орієнтований аналіз та дизайн (1.26-27.)
- **Section:** Module 7. Infrastructure as Code → Lab
- **URL:** https://learn.ucu.edu.ua/mod/assign/view.php?id=156846
- **Due:** Saturday 31 October 2026, 23:55 PM

## What you submit

1. A link to the **commit** (or merged pull request) that replaces the three CloudFormation templates (`infra/auth.yml`, `infra/reports.yml`, `infra/ai.yml`) with Terraform in `infra/`, updates the `Makefile` and `README.md`, and adds the short ADR from Part 2, Step 6.
2. A screenshot of an **HCP Terraform run** for your project's workspace that finished with **Apply finished**, started by a push or a merge, not from your laptop.
3. The output of **`terraform plan` right after the migration**, ending in `No changes. Your infrastructure matches the configuration.`

## Part 2 Summary — Steps

1. **Step 1 — Lay out `infra/`:** `versions.tf`, `variables.tf`, `auth.tf`, `reports.tf`, `ai.tf`, `outputs.tf`, `imports.tf` (temporary), `terraform.tfvars` (non-secret values only). One HCP Terraform workspace (e.g. `wca-badges-dev`) in **Remote** execution mode using OIDC dynamic AWS credentials (`~/tf-bootstrap`).
2. **Step 2 — Translate templates to HCL:** Exact resource parity and exact physical names (`wca-badges-user-pool`, `wca-badges-reports-297580066889`, `wca-badges-agenda-parser`, etc.), sensitive variables in HCP Terraform workspace, `terraform fmt` & `terraform validate`.
3. **Step 3 — Zero-loss adoption (`Retain` + `import`):**
   - **3a:** Add `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to every resource in `auth.yml`, `reports.yml`, `ai.yml`, deploy once more, then `aws cloudformation delete-stack` on the 3 stacks so resources remain alive in AWS.
   - **3b:** Write `import` blocks in `infra/imports.tf` with real AWS IDs.
   - **3c:** Run `terraform plan` until `0 to destroy` (and zero `# forces replacement` on User Pool or Reports S3 bucket), apply, run `terraform plan` again -> `No changes. Your infrastructure matches the configuration.` (save output for Deliverable 3!), then remove `imports.tf` and the 3 `.yml` files.
4. **Step 4 — Makefile, README & GitHub VCS pipeline:** Switch `Makefile` from `aws cloudformation` to `terraform output -raw ...` and `make infra-plan` (NO `terraform apply` in `Makefile`), connect HCP Terraform workspace to GitHub repo (`working directory: infra`), make a small PR (e.g. tag or log retention), review plan check, merge to `main`, screenshot **Apply finished** in HCP Terraform (Deliverable 2!).
5. **Step 5 — Drift experiment:** Change one setting by hand in AWS Console (e.g. parser timeout), run Plan in HCP Terraform to observe drift detection, let Terraform restore it.
6. **Step 6 — ADR (`docs/adr/`):** Context, decision, alternatives (CloudFormation, CDK, OpenTofu), consequences, who changes infra, where secrets live (including state), and what happens if HCP Terraform is down.
