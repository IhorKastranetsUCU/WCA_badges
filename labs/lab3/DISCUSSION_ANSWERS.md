# Architecture & Migration Lab Discussion Questions & Notes 🏛️⚡

This document provides rigorous, production-grade answers to all architectural questions for Lab 3: **Serverless Architecture Migration & Amazon Cognito Authentication**.

---

## Part 1 — The Migration & Architecture Trade-offs

### 1. Hourly Billing Resources: Stage 0 vs. Stage 2
* **Application Load Balancer (ALB):**
  * *Stage 0:* Charged ~$0.0225/hour (~$16.43/mo) just for existing, plus LCU charges.
  * *Stage 2:* **Disappeared.** Replaced by a native **Lambda Function URL** (`https://<id>.lambda-url.us-east-1.on.aws`), which provides free HTTPS endpoints with zero base cost.
* **Public IPv4 Addresses:**
  * *Stage 0:* AWS charges $0.005/hour per public IPv4 ($3.65/mo per IP). An ALB across 2 AZs (2 IPs) + 1 public Fargate task = 3 IPv4s = ~$10.95/mo.
  * *Stage 2:* **Disappeared.** Lambda uses private ENIs within AWS's VPC Hyperplane architecture and CloudFront sits at edge locations with Anycast, incurring zero individual IPv4 hourly fees.
* **API Compute:**
  * *Stage 0:* ECS Fargate (0.25 vCPU, 0.5 GB) billed 24/7 at ~$9.01/mo regardless of whether any HTTP requests arrived.
  * *Stage 2:* **Lambda compute.** Scales down to 0 instances when idle, incurring $0/month.
* **Database Compute:**
  * *Stage 0:* RDS PostgreSQL `db.t3.micro` billed 24/7 at $0.018/hour (~$13.14/mo).
  * *Stage 2:* **Aurora Serverless v2 (0–1 ACU)** with auto-pause. Pauses after 5 idle minutes, reducing compute cost to $0/mo when idle.

---

### 2. Paying for Being Reachable (ALB & Public IPv4)
When paying for the ALB and public IPv4 addresses, you are **not paying for your code to run**. You are paying for:
1. **Network reservation & routing capacity:** Dedicated AWS network load-balancing instances allocated in multiple availability zones listening for TCP SYN packets.
2. **Public IPv4 scarcity tax:** Global IPv4 address depletion led AWS to charge $0.005/hour per IP as an economic incentive to transition to IPv6.

---

### 3. Aurora 15-Second Resume Latency
* **Who pays the cost?** The **user** who sends the first request after a 5-minute idle period pays with their time (waiting ~15 seconds for Aurora's storage engine and buffer pool to initialize).
* **When is it acceptable?**
  * In student projects, demo apps, development environments, and internal back-office tools used during business hours.
  * When saving ~$13–$15/mo per idle environment is prioritized over initial latency.
* **When is it a bug / unacceptable?**
  * In customer-facing e-commerce or B2B SaaS where a 15-second delay causes checkout abandonment, SLA violations, or webhook timeouts from external payment gateways (e.g., Stripe times out after 10–20s).

---

### 4. CORS: Single Origin vs. Direct Calls
* **What changed:** In Stage 0, CloudFront routed both `/*` (S3) and `/api/*` (ALB) through a single hostname (`https://demo.domain.com`), so the browser treated them as the **same origin** (no CORS preflights needed). In Stage 2, the frontend calls the Lambda Function URL (`https://<id>.lambda-url.us-east-1.on.aws`) directly, creating a cross-origin request.
* **How to return to a single origin:** Add the Lambda Function URL (or API Gateway) as a second origin in the CloudFront distribution under behavior path pattern `/api/*`.

---

### 5. Circular Dependency & How Makefile Breaks It
* **The Cycle:** The frontend build bakes in `VITE_API_BASE_URL` (requires backend URL first), while the backend CORS configuration needs `FRONTEND_URL` (requires frontend distribution/domain first).
* **Breaking the Cycle:** The Makefile deploys the **backend first** with a wildcard or preliminary CORS (`*`), records the Lambda Function URL, injects it into the frontend build, deploys the frontend, and optionally updates backend CORS to the specific CloudFront domain on subsequent pushes.
* **Where else does this cycle appear?** In **OAuth / Cognito Callback URLs**: Cognito requires the exact client redirect URI before creating the user pool client, but the site's final URL is only known after deploying DNS/CloudFront.

---

### 6. No NAT Gateway in VPC Lambda
* **Why no NAT Gateway?** A single AWS Managed NAT Gateway costs ~$0.045/hour (~$32.85/mo) plus data transfer charges—exceeding the cost of the entire stack combined.
* **What stops working?** Any outgoing call from Lambda to public internet APIs (e.g., calling OpenAI/Anthropic LLM APIs, sending external webhooks, or fetching external WCA API data) will hang and time out unless:
  1. A NAT Gateway is provisioned, or
  2. The Lambda is placed outside the VPC (accessing a database with public accessibility or using AWS RDS Proxy / Data API), or
  3. AWS VPC Endpoints (PrivateLink) are configured for specific AWS services.

---

### 7. Region Migration: eu-central-1 → us-east-1
* **Cost to Ukrainian users:** Adds ~90–120ms round-trip network latency on every API call (transatlantic fiber transit to Virginia vs. ~30ms to Frankfurt).
* **Cost to an EU company (GDPR):** Transferring EU citizen personal data to US-based infrastructure introduces compliance hurdles under GDPR Chapter V (cross-border data transfers, requirement for Standard Contractual Clauses (SCCs), Data Privacy Framework certification, and supplemental technical measures).

---

## Part 2 — Cost Analysis

### 8. Scenario Table
* **Student/Lab Deployment:** **"Nobody uses it"** or **"Class demos"** (~0–20 awake hours/month).
* **Cost in Stage 2:** ~$0.30 – $1.50/month (nearly 97% savings vs. Stage 0's $52/month).

### 9. Uptime Monitor Health Check Trap
* If an uptime monitor pings `GET /api/health` every minute:
  * If `/health` runs a `SELECT 1` or queries the database, Aurora **will never pause**.
  * Aurora stays awake 730 hours/month, billing at 0.5–1 ACU ($0.06/ACU-hr) = **$44–$88/month**, completely erasing the serverless cost benefit.
* **Fix:** Make `/api/health` a pure in-memory liveness check (e.g. `{"status": "ok"}`) without querying the database, or use a separate dedicated `/api/ready` endpoint for deep diagnostic checks that is not polled continuously.

### 10. Migration Break-Even Point
* Migrating back to containers and a provisioned RDS instance makes financial sense when:
  * Traffic exceeds **~130–250 database-active hours/month**, or
  * Lambda requests exceed **~42 million requests/month**.
* **Metric to watch in Cost Explorer:** Group costs by `Usage Type` and `Service`. Watch for `Aurora:ServerlessUsage` and `Lambda:Request-Tier` exceeding the monthly cost of an EC2/RDS reserved instance.

---

## Part 3 — Amazon Cognito & Authentication

### 11. ID Token vs. Access Token
* **ID Token:** Intended for the **client application (frontend)**. Formatted as a JWT containing user identity claims (`email`, `name`, `sub`, `picture`). Used by the frontend to render the user's profile and avatar.
* **Access Token:** Intended for the **resource server (API)**. Contains authorization scopes and claims (`sub`, `iss`, `client_id`, `scope`). The frontend sends the **Access Token** in the `Authorization: Bearer <token>` header to the backend API.

---

### 12. Public Client & PKCE (Proof Key for Code Exchange)
* **Why PKCE for Public Clients?** Single Page Applications (SPAs) run in the user's browser where JavaScript code is completely inspectable. A client secret cannot be stored securely.
* **What PKCE Protects Against:** An authorization code interception attack. Without a secret, if an attacker intercepts the authorization code from the browser redirect, they could exchange it for tokens. With PKCE, the client generates a cryptographic `code_verifier` and sends `code_challenge = SHA256(verifier)`. The token endpoint requires the original secret `code_verifier`, which only the initiating browser session possesses.

---

### 13. Same Email: Password vs. Google Sign-In
* **What happens:** Cognito creates two distinct user identities in the User Pool (e.g. `auth_user_uuid` vs. `Google_10928374...`), each with a different `sub` claim.
* **What breaks:** Any database table using `user_sub` as a foreign key treats them as two completely separate users with disconnected data.
* **Account Linking:** Cognito allows admin linking via `AdminLinkProviderForUser`. However, **automatically linking accounts based on email alone is dangerous** because an attacker could register an unverified password account with a victim's email, wait for the victim to sign in with Google, and gain access to their account. Linking should only occur when both identities have cryptographically verified email ownership.

---

### 14. Secrets: Google Client Secret vs. Cognito App Client
* **Why Cognito can hold Google's secret:** Cognito's backend runs on AWS server infrastructure (confidential environment). It securely stores the Google Client Secret in encrypted AWS storage and communicates server-to-server with Google's token endpoint.
* **Why the SPA cannot hold a secret:** The browser is a public, untrusted client. Anyone can inspect browser memory, local storage, or network traffic via DevTools.

---

### 15. API Token Verification (Backend vs. Frontend)
* **Why backend verification is mandatory:** If only the frontend checked tokens, an attacker could bypass the UI entirely, open a terminal, and run `curl -X POST https://<api-url>/api/meetings` with fabricated data. Frontend validation is for user experience; backend verification is the security boundary.
* **Why not `AuthType: AWS_IAM` on Lambda Function URL?** `AWS_IAM` requires requests to be signed using AWS Signature Version 4 (SigV4) with AWS IAM credentials. End users logging into a public web app do not have AWS IAM users or SigV4 signing libraries in their browser.
* **API Gateway JWT Authorizer:**
  * *Benefits:* Validates signatures, expiration, and claims at the edge before invoking Lambda, saving compute costs on unauthorized traffic and eliminating token validation code from your app.
  * *Costs:* API Gateway costs $1.00 per million requests (Function URLs are free), adding latency and an extra service to maintain.
