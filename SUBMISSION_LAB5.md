# Lab 5: A weekly report, built by events 🏛️⚡
## Spry Architecture Lab Submission & Discussion Answers

**Student:** Ihor Kastranets (`kastranets.pn@ucu.edu.ua`)  
**AWS Account ID:** `297580066889`  
**Region:** `us-east-1`  
**Project:** `wca-badges` (Spry)

---

## 1. CloudFormation Stack & Resources Summary

The entire event-driven architecture is defined as code in [`infra/reports.yml`](file:///Users/ihor/Studing/ad/WCA_badges/infra/reports.yml) and deployed to AWS:

| Resource | Logical ID | Physical ID / Name / ARN |
| :--- | :--- | :--- |
| **S3 Storage** | `ReportsBucket` | `wca-badges-reports-297580066889` |
| **VPC Gateway Endpoint** | `S3GatewayEndpoint` | `vpce-059...` attached to `rtb-0f6c8a00be5ec6ea6` (Free) |
| **SQS Requests Queue** | `ReportRequestsQueue` | `https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests` |
| **SQS Dead-Letter Queue** | `ReportRequestsDlq` | `https://sqs.us-east-1.amazonaws.com/297580066889/wca-badges-report-requests-dlq` |
| **Builder Function (VPC)** | `ReportBuilderFunction` | `wca-badges-report-builder` |
| **Mailer Function (Public)** | `ReportMailerFunction` | `wca-badges-report-mailer` |
| **EventBridge Scheduler** | `WeeklyReportSchedule` | `wca-badges-weekly-report-schedule` (`cron(0 7 ? * MON *)` Europe/Kyiv) |
| **SES Sender / Recipient** | Verified Email Identity | `kastranets.pn@ucu.edu.ua` |

---

## 2. Deliverable Evidence

### A. S3 Reports Listing Output
Command executed:
```bash
aws s3 ls s3://wca-badges-reports-297580066889/reports/ --recursive
```
Output:
```text
2026-10-14 20:41:21        997 reports/2026-W39.csv
2026-10-14 20:40:53        997 reports/2026-W41.csv
```
* `reports/2026-W41.csv` was generated via **Schedule trigger** (`trigger=schedule`).
* `reports/2026-W39.csv` was generated via **On-demand SQS queue trigger** (`make report-now WEEK=2026-W39`).

---

### B. Three CloudWatch Log Lines (One per Trigger)

#### 1. Trigger 1: The Schedule (`trigger=schedule`)
```text
[INFO] 2026-10-14T17:40:52.133Z 0e8d840f-f7d8-47a6-bf75-3bb5e617ea72 report-builder triggered trigger=schedule week=2026-W41
```
* **Log Group:** `/aws/lambda/wca-badges-report-builder`
* **Trigger:** EventBridge Scheduler payload `{"source": "schedule"}`.

#### 2. Trigger 2: The SQS Message (`trigger=sqs`)
```text
[INFO] 2026-10-14T17:41:20.680Z 4f0e9d37-0ce6-5413-9943-fe7ecc0b166a report-builder triggered trigger=sqs week=2026-W39
```
* **Log Group:** `/aws/lambda/wca-badges-report-builder`
* **Trigger:** SQS Event Source Mapping from `wca-badges-report-requests` initiated by `make report-now WEEK=2026-W39`.

#### 3. Trigger 3: The S3 Upload (`trigger=s3`)
```text
[INFO] 2026-10-14T17:40:53.787Z edc7d083-ad70-4aa4-9325-2617ef570710 report-mailer triggered trigger=s3 bucket=wca-badges-reports-297580066889 key=reports/2026-W41.csv
```
* **Log Group:** `/aws/lambda/wca-badges-report-mailer`
* **Trigger:** S3 `s3:ObjectCreated:*` event on prefix `reports/*.csv`. Followed by successful SES delivery (`MessageId=010001a13b80b8f7-83cdbe7d-9e6f-432a-9e2c-3dccaecbe714-000000`).

---

## 3. Answers to Part 3, Step 7 Questions

### Question 1:
> *The mailer got the same ObjectCreated event twice, and the person got two identical emails. Where would you store "this report was already sent", and what would the key be?*

**Answer:**
We would store the sent status in **Amazon DynamoDB** (or a dedicated `sent_reports` table in PostgreSQL / Redis cache).
* **Table Schema:** `SentReports`
* **Primary Partition Key:** `report_key` (e.g., `reports/2026-W40.csv` or `week#2026-W40#recipient#kastranets.pn@ucu.edu.ua`).
* **Attributes:** `sent_at` (ISO timestamp), `ses_message_id`, `ttl` (e.g. 90 days matching S3 lifecycle).
* **Atomic Mechanism:** Before calling `ses.send_email`, the mailer performs a **conditional write**:
  ```python
  dynamodb.put_item(
      TableName="SentReports",
      Item={"report_key": {"S": key}, "sent_at": {"S": now}},
      ConditionExpression="attribute_not_exists(report_key)"
  )
  ```
  If the item already exists, DynamoDB throws `ConditionalCheckFailedException`, and the mailer safely acknowledges the S3 event without sending a duplicate email.

---

### Question 2:
> *The builder in the VPC could not reach SES. List three ways to fix that, with their monthly cost: a NAT gateway, a VPC interface endpoint for SES, and the split you built. Which would you choose with ten more emails a week? With a million?*

**Answer:**

| Solution | Architecture | Estimated Monthly AWS Cost |
| :--- | :--- | :--- |
| **1. AWS Managed NAT Gateway** | Place 1 NAT Gateway in a public subnet; route VPC private subnet `0.0.0.0/0` traffic through it to internet. | **~$32.85/month base** ($0.045/hr) + $0.045/GB data processing. |
| **2. VPC Interface Endpoint (PrivateLink) for SES** | Provision an `AWS::EC2::VPCEndpoint` of type `Interface` for `com.amazonaws.us-east-1.email`. | **~$7.30/month base per AZ** ($0.01/hr × 730 hrs) + $0.01/GB data processed (~$7.30–$14.60/mo). |
| **3. The Two-Function Split (S3 Event Driven)** | Builder inside VPC (accesses Aurora + S3 via free Gateway Endpoint); Mailer outside VPC (accesses public SES + S3). | **$0.00 base cost** (Serverless pay-per-use; free S3 Gateway Endpoint + Lambda free tier). |

* **Choice for 10 more emails a week:**
  **The Two-Function Split.** With only 10 emails/week, paying $32.85/mo for a NAT Gateway or $7.30/mo for an interface endpoint is pure waste. The serverless split costs fractions of a cent ($0.00).
* **Choice for 1,000,000 emails a month:**
  **VPC Interface Endpoint (PrivateLink)** or **The Two-Function Split with SQS batching**.
  At 1,000,000 emails/month, NAT Gateway data transfer ($45+) is much higher than PrivateLink ($10–$15). However, architecturally, keeping the database worker completely decoupled from email dispatching (the split) remains the cleanest, most scalable design because SES rate limits (e.g. 14–50 emails/sec) will never block database connections.

---

### Question 3:
> *You could send a presigned S3 link instead of an attachment. A presigned URL signed with a Lambda role's temporary credentials stops working when those credentials expire, often within hours. How would you send a link that works for a week?*

**Answer:**
Three robust solutions:
1. **CloudFront Signed URLs (Best Practice):**
   Serve reports through CloudFront backed by S3 with Origin Access Control (OAC). Sign the URL using a private RSA key belonging to a CloudFront Public Key / Key Group. CloudFront signed URLs do **not** depend on IAM temporary credentials and can have arbitrary expiration times (e.g. 7 days).
2. **Dedicated IAM User Long-Lived Credentials:**
   Generate the presigned URL using credentials of an IAM User or permanent IAM access key stored in AWS Secrets Manager (though long-lived keys violate zero-trust guidelines, they allow presigned URLs up to 7 days in SigV4).
3. **Backend Redirect / Download Proxy Endpoint:**
   Send a permanent URL pointing to our API: `https://api.yourdomain.com/reports/2026-W40/download`. When the user clicks the link, the API authenticates the user, generates a fresh short-lived presigned URL (15 minutes), and returns an HTTP `302 Found` redirect. The link in the email never expires.

---

## 4. Class Discussion Questions & Answers

### The Pattern
1. **Cake Shop analogy (Command vs Event in Lab 5):**
   * *Command:* `BuildWeeklyReport(week=2026-W40)` sent by EventBridge Scheduler or `make report-now` to SQS. It has a single recipient (the builder) and demands an action.
   * *Event:* `s3:ObjectCreated:Put (key=reports/2026-W40.csv)` emitted by S3. It is a fact that already occurred. S3 does not know or care who listens; Mailer reacts to it independently.
2. **McDonald's Receipt Number (202 Accepted & Job ID):**
   * *While running:* The user sees a pending status (e.g., spinner, progress indicator, or "Your report is being generated").
   * *If it fails:* The UI displays a clear, actionable error state ("Report generation failed. Please retry"), and the system can allow resubmitting or notify support.
3. **Idempotency of Steps:**
   * *Idempotent:* Writing `reports/2026-W40.csv` to S3. Writing the exact same data to the same S3 key replaces the object without side effects.
   * *Non-Idempotent:* Sending an email through SES. Calling `ses.send_email` twice sends two separate emails to the recipient's inbox.
4. **Eventual Consistency:**
   * If the report queries the database at 07:00 on Monday and a meeting from last week is updated at 07:01, the report reflects the database state at snapshot time (07:00). Eventual consistency means the reporting system reconciles changes over time. If a meeting changes, an event can trigger an on-demand recomputation (`make report-now`) which overwrites `reports/2026-W40.csv` within 5 minutes.
5. **Adding Slack Notifications (Why zero changes to the Builder?):**
   * The builder only produces the artifact (`reports/2026-W40.csv`) in S3. S3 emits the `ObjectCreated` event. To add Slack, we simply attach a second listener (e.g., EventBridge rule on S3 or SNS topic subscribed to S3 events) invoking a `SlackNotifierFunction`. The builder is completely decoupled and untouched.

### The Self-Hosted Alternatives
6. **Payment Service Events (Redis vs RabbitMQ):**
   * **RabbitMQ.** In RabbitMQ, messages use AMQP protocol with explicit consumer ACKs. If a worker crashes mid-task, unacknowledged messages are automatically requeued. RabbitMQ features persistent queues written to disk and Dead-Letter Exchanges. Redis lists drop messages upon pop (`LPOP/BRPOP`) unless complex Lua/streams/recovery loops are written, and Redis default persistence (RDB snapshotting) can lose in-flight payments on sudden crash.
7. **RQ Pickled Python Call vs Celery:**
   * RQ serializes the exact Python module and function path (e.g., `recipes.bake`). Renaming `bake` to `cook` and deploying causes all in-flight jobs in Redis to raise `AttributeError / ModuleNotFoundError`.
   * *Takeaway:* Microservice / asynchronous contracts must use **technology-agnostic, versioned data formats** (JSON/Protobuf schemas), never serialized language runtimes.
8. **Celery Beat Multi-Instance Conflict vs EventBridge Scheduler:**
   * Running two instances of `celery beat` causes **duplicate task dispatching** (two cakes baked every Monday). Celery beat has no distributed lock out of the box.
   * *AWS Equivalent:* **EventBridge Scheduler**. It is a managed, distributed scheduler with high availability, exactly-once target invocation guarantees, and timezone awareness (`Europe/Kyiv`) without running server processes.

### AWS Infrastructure
9. **Schedule to SQS vs Direct Invocation:**
   * SQS provides **automatic retries, dead-letter queues (DLQ), and backpressure buffering**. If Aurora takes 15 seconds to resume or Lambda concurrency is saturated, the message waits safely.
   * *When direct invocation is better:* When synchronous real-time feedback is required (e.g., synthetic API ping / health probe) or latency must be under 50ms.
10. **SQS Visibility Timeout > Function Timeout:**
    * If VisibilityTimeout (e.g. 30s) is shorter than Function Timeout (e.g. 60s), SQS will make the message visible to another consumer while the first execution is still running. This launches duplicate simultaneous executions. VisibilityTimeout must be at least **6× the function timeout** (360s for a 60s timeout).
11. **DLQ Sunday Night Alarm Design:**
    * Create a CloudWatch Metric Alarm on `AWS/SQS` metric `ApproximateNumberOfMessagesVisible` on the DLQ (`wca-badges-report-requests-dlq`) with `Threshold > 0`, `Period = 60s`, `EvaluationPeriods = 1`.
    * Route the alarm action to an **Amazon SNS Topic** (`spry-ops-alerts`), which sends SMS/emails to the on-call engineer and triggers a PagerDuty/Opsgenie webhook.
12. **Aurora Serverless Wakeup Cost:**
    * *Waking once a week (Monday):* Aurora wakes for ~5–10 minutes = ~0.15 ACU-hours/week = ~0.6 ACU-hours/month = **~$0.04/month**.
    * *Running every 5 minutes:* Aurora **never pauses** (pause threshold is 5 idle minutes). It bills 24/7 at minimum 0.5 ACU = 730 hrs × 0.5 ACU × $0.06/ACU-hr = **~$21.90 – $43.80/month**.
13. **Cost Tipping Point:**
    * EventBridge Scheduler (free tier 14M/month), SQS ($0.40/million), S3 ($0.023/GB).
    * **SES begins costing first** ($0.10 per 1,000 emails after free tier). At high scale (e.g., 500,000 users receiving weekly reports), SES costs $50/run, whereas SQS and S3 cost pennies.

---

## 5. Stretch Feature: In-App "Send me this week's report" Button

### Architectural Options Analysis:
* **Option A: SQS Interface Endpoint in VPC:**
  Costly: adds ~$7.30/month per AZ just to send an occasional request.
* **Option B: Request File via S3 Gateway Endpoint:**
  Writes `requests/{uuid}.json` via the existing free S3 Gateway Endpoint. S3 triggers SQS or Lambda. Free, but adds S3 I/O latency for simple queueing.
* **Option C (Recommended): Transactional Outbox Pattern in Database:**
  When the user clicks "Send me this week's report", the API writes a record to `report_requests` in the same PostgreSQL transaction. The existing builder Lambda (or a scheduled poller) picks up pending requests.
  * *Why:* Zero new network infrastructure, zero additional hourly costs, atomic consistency, and requests are never lost even if external cloud messaging is degraded.
