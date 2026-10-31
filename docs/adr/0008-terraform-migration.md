# ADR 0008: Migration of Application Infrastructure from CloudFormation to Terraform with HCP Terraform

## Status
Accepted

## Context
In Labs 3, 5, and 6, our serverless AWS architecture was defined across multiple standalone CloudFormation templates (`infra/auth.yml`, `infra/reports.yml`, `infra/ai.yml`). While CloudFormation provided basic Infrastructure as Code (IaC) capabilities inside AWS, several architectural and operational limitations became apparent:
1. **Single-Cloud & Proprietary Lock-In:** CloudFormation is strictly scoped to AWS resources. Real-world services in our application—such as Google OAuth federation, GitHub Actions CI/CD workflows, and external AI providers (Gemini API)—cannot be provisioned or configured directly within CloudFormation templates.
2. **Opaque & Imperfect Drift Detection:** CloudFormation change sets do not provide a concise, deterministic diff before deployment. Parameter or property changes that require replacement can silently destroy and recreate stateful services (such as Amazon Cognito User Pools or Amazon S3 buckets) if not carefully safeguarded.
3. **Local State & Credential Hazards:** Running `aws cloudformation deploy` from developer laptops introduces credential leakage risks (long-lived IAM keys) and lacks centralized locking, state management, and team-wide run histories.

## Decision
We migrate the application infrastructure stacks (`auth.yml`, `reports.yml`, `ai.yml`) to **HashiCorp Terraform (HCL)** managed centrally via **HCP Terraform (formerly Terraform Cloud)** under the workspace `WCA_badges` in organization `ooad-IhorKastranetsUCU`:
- **Auth Layer (`infra/auth.tf`):** Amazon Cognito User Pool, Managed Login v2 branding, Hosted Domain, SPA Public Client, and Google Identity Provider federation.
- **Async Reports Layer (`infra/reports.tf`):** Private S3 reports bucket with 90-day lifecycle rule, S3 Gateway VPC Endpoint, SQS queue and DLQ, EventBridge Scheduler, Builder Lambda (inside VPC), Mailer Lambda (outside VPC with SES access), and S3 event notifications.
- **AI Agenda Parser (`infra/ai.tf`):** Agenda Parser Lambda with Bedrock Claude / Gemini multimodal fallback, public Function URL with CORS, and IAM inference role.

The foundational base stacks (`backend.yml` for API/VPC and `frontend.yml` for CloudFront/S3 SPA hosting) remain in CloudFormation as provisioned in earlier labs, demonstrating a hybrid cloud adoption model.

## Alternatives Considered
1. **Remain on CloudFormation:**
   - *Pros:* Native to AWS, zero external tooling required.
   - *Cons:* No multi-provider capability, complex secrets parameter management, high friction for team code reviews and automated speculative plans on pull requests.
2. **AWS Cloud Development Kit (CDK):**
   - *Pros:* Allows writing infrastructure in TypeScript or Python.
   - *Cons:* Synthesizes CloudFormation templates under the hood, inheriting all of CloudFormation's deployment quirks, state opacity, and vendor lock-in.
3. **OpenTofu:**
   - *Pros:* Fully open-source, community-governed drop-in fork of Terraform.
   - *Cons:* While local syntax is identical, HCP Terraform provides native hosted state locking, speculative PR plan integrations, and managed OIDC dynamic credentials out-of-the-box for our course workflow.

## Operational & Security Consequences
- **Who Changes Infrastructure:** Infrastructure changes are exclusively driven by version control (VCS). Developers submit Pull Requests to GitHub repository `IhorKastranetsUCU/WCA_badges`. HCP Terraform automatically computes and comments a speculative plan on the PR. No engineer runs `terraform apply` from a personal laptop. Merging into `main` automatically executes the plan.
- **Dynamic Credentials via AWS OIDC:** HCP Terraform does not store static AWS Access Keys. Instead, an IAM OIDC Identity Provider (`app.terraform.io`) and role `arn:aws:iam::297580066889:role/hcp-terraform-ooad-IhorKastranetsUCU` issue temporary, short-lived STS credentials for the exact duration of each plan and apply run.
- **Where Secrets Live:** Sensitive credentials (`gemini_api_key`, `google_client_secret`) are stored exclusively in the HCP Terraform Workspace as **Sensitive Variables** (write-only). They are never committed to git, written to `terraform.tfvars`, or logged in plain text.
- **Zero-Loss Adoption:** Existing production resources were adopted without downtime or data destruction using `DeletionPolicy: Retain` on CloudFormation before stack deletion, followed by Terraform 1.10+ `import` blocks.
- **Disaster Recovery / HCP Outage:** Live AWS resources operate independently of HCP Terraform. An outage at `app.terraform.io` does not affect the running website or AWS Lambda invocations. If urgent emergency updates are needed during an HCP outage, the Terraform state can be inspected or cloned locally using admin AWS credentials.
