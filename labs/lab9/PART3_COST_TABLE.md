# Lab 9, Part 3 — Multi-Cloud Cost Comparison (AWS vs Google Cloud)

**Pricing baseline:** On-demand list prices in USD (checked 5 November 2026), **AWS `us-east-1`** vs **Google Cloud `us-central1`**, excluding tax, 730 hours/month.  
**Free-tier & architecture assumptions:**
- **AWS (Lab 4, Stage 2):** S3 + CloudFront Free plan (`$0`), AWS Lambda (`1M` free requests & `400,000 GB-s/month` → `$0` under student/demo traffic), Aurora Serverless v2 (`0–1 ACU`, auto-pauses after `5 min` idle; `$0.12/ACU-hr` → `$0.06/hr` at `0.5 ACU`, `$0.12/hr` at `1.0 ACU`), ~`1 GB` DB storage (`$0.10/GB-mo`), ECR + Secrets/Logs (`~$0.20/mo`).
- **Google Cloud (Lab 9):** Firebase Hosting Spark free plan (`10 GB` stored, `360 MB/day` egress → `$0`), Cloud Run request-based billing (`2M` free requests, `180,000 vCPU-s`, `360,000 GiB-s` free/month → `$0` under student/demo traffic; `min_instance_count = 0`), Artifact Registry (`0.5 GB` free, compressed image `~0.38 GB` → `$0`), Secret Manager (`6` active versions free → `$0`), Cloud Logging (`50 GiB/mo` free → `$0`).
- **Database variants compared on GCP:**
  1. **Cloud SQL (`db-f1-micro`, running 24/7):** `$0.0105/hr` compute (never auto-pauses) + `10 GB` SSD at `$0.17/GB-mo` (`$1.70/mo`).
  2. **Cloud SQL (`db-f1-micro`, stopped when idle):** `$0.0105/hr` only while active (`activation_policy = ALWAYS`), `$0/hr` when stopped (`NEVER`), plus `$1.70/mo` SSD storage (billed even while stopped).
  3. **Firestore (serverless NoSQL alternative):** `50,000` reads/day, `20,000` writes/day, `20,000` deletes/day, `1 GiB` stored free/day; `$0.03` per `100k` extra reads.

---

## 1. Baseline Reference: Nobody Using It for a Month (0 active hours)

| Piece | AWS (`us-east-1`, Lab 4 Stage 2) | Google Cloud (`us-central1`, Cloud SQL running) | Google Cloud (`us-central1`, Cloud SQL stopped) | Google Cloud (`us-central1`, Firestore) |
|---|---:|---:|---:|---:|
| **Frontend + CDN + HTTPS** | CloudFront Free + S3 (`$0.00`) | Firebase Hosting Free (`$0.00`) | Firebase Hosting Free (`$0.00`) | Firebase Hosting Free (`$0.00`) |
| **API Compute** | Lambda idle (`$0.00`) | Cloud Run `min=0` idle (`$0.00`) | Cloud Run `min=0` idle (`$0.00`) | Cloud Run `min=0` idle (`$0.00`) |
| **Database Compute** | Aurora paused (`$0.00`) | Cloud SQL `db-f1-micro` 730h (`$7.67`) | Cloud SQL stopped (`$0.00`) | Firestore serverless (`$0.00`) |
| **Database Storage** | ~1 GB @ `$0.10/GB` (`$0.10`) | 10 GB SSD @ `$0.17/GB` (`$1.70`) | 10 GB SSD @ `$0.17/GB` (`$1.70`) | <1 GiB free tier (`$0.00`) |
| **Registry, Secrets, Logs** | ECR + SSM + CloudWatch (`~$0.20`) | Within free tier (`$0.00`) | Within free tier (`$0.00`) | Within free tier (`$0.00`) |
| **Total / month** | **~$0.30** | **~$9.37** | **~$1.70** | **$0.00** |

---

## 2. Four Traffic Profiles (Lab 4 Comparison)

| Traffic Profile | Active DB Hours / Month | AWS (`us-east-1`, Aurora 0.5 ACU) | GCP (Cloud SQL `db-f1-micro` 24/7) | GCP (Cloud SQL `db-f1-micro` stopped idle) | GCP (Firestore) | Cheaper Cloud & Deciding Line |
|---|---:|---:|---:|---:|---:|---|
| **1. Nobody** | `0 h` | **$0.30** | `$9.37` | `$1.70` | `$0.00` | **AWS** beats Cloud SQL (`$0.30` vs `$1.70`/`$9.37`) via Aurora auto-pause + 1 GB storage; **Firestore** ties/wins at `$0.00` |
| **2. Class demos (`10 × 2 h`)** | `20 h` (`~20.8 h` w/ 5m tail) | **$1.55** (`20.8h × $0.06 + $0.30`) | `$9.37` | `$1.91` (`20h × $0.0105 + $1.70`) | `$0.00` | **AWS** slightly cheaper than stopped Cloud SQL (`$1.55` vs `$1.91`) due to Cloud SQL's `10 GB` SSD minimum (`$1.70`); **Firestore** `$0.00` |
| **3. Office hours (`8 h × 22 d`)** | `176 h` (`~177.8 h` w/ 5m tail) | `$10.97` (`177.8h × $0.06 + $0.30`) | **`$9.37`** | **`$3.55`** (`176h × $0.0105 + $1.70`) | `$0.00` | **GCP** wins (`$3.55` stopped or `$9.37` 24/7 vs `$10.97` AWS) — Aurora's `$0.06/hr` crosses `db-f1-micro`'s flat `$7.67` around `~128 h/mo` |
| **4. Busy around the clock** | `730 h` | `$44.10` (0.5 ACU) – `$87.90` (1.0 ACU)* | **`$9.37`** (API ≤2M req)* | **`$9.37`** | `$0.00`–`$1.35`** | **GCP** wins decisively (`$9.37` vs `$44.10–$87.90`) because `db-f1-micro` caps compute at `$7.67/mo` |

*\*Note on busy 24/7 API compute: above 2M Cloud Run requests/month (e.g., 5M requests @ 100ms, 1 vCPU, 512 MiB), Cloud Run adds ~$8.48/mo, keeping GCP (~$17.85) far below AWS (~$44–$95+).*  
*\*\*Firestore assumes ≤50k reads/day (`$0.00`), or 200k reads/day (`4.5M` billable reads/mo × `$0.03/100k` = `$1.35/mo`).*

---

## 3. Part 3 Analysis Questions

1. **Which cloud is cheaper for each profile, and which single line decides it?**
   - **Database compute** (plus Cloud SQL's 10 GB minimum storage at low hours) is the single line that decides every profile; Frontend (`$0`), API (`$0` within free tiers), and Registry/Secrets/Logs (`$0`–`$0.20`) are negligible.
   - At **low utilization** (*Nobody* = 0 h, *Class demos* = 20 h), **AWS is cheaper than Cloud SQL** (`$0.30` and `$1.55` vs `$9.37` 24/7 or `$1.70`/`$1.91` stopped) because Aurora Serverless v2 pauses to `$0/hr` and has no 10 GB storage floor. Only rewriting to **Firestore** (`$0.00`) beats AWS at idle.
   - Above **~128 active hours/month** (*Office hours* = 176 h, *Busy 24/7* = 730 h), **GCP Cloud SQL (`db-f1-micro`) becomes cheaper than Aurora** (`$3.55–$9.37` vs `$10.97–$87.90`) because a fixed `$0.0105/hr` shared-core instance beats `$0.06–$0.12/hr` serverless ACUs.

2. **Lab 4 showed that Aurora can become more expensive than an instance when something keeps it awake. Where is the equivalent trap on the GCP side?**
   - **Trap 1 (Cloud SQL idle / tier creep):** Cloud SQL never auto-pauses; forgetting to stop `db-f1-micro` bills `$9.37/mo` for 0 users, choosing `db-g1-small` (`$0.035/hr`) or `REGIONAL` HA jumps to `$27–$55+/mo`, and even a stopped instance still bills `$1.70/mo` for its SSD until deleted.
   - **Trap 2 (Cloud Run `min_instance_count >= 1` or `cpu_idle = false`):** Disabling scale-to-zero forces continuous CPU/memory billing 730 h/mo instead of request-based billing.
   - **Trap 3 (Firestore unbounded reads):** Just as a `/health` SQL check keeps Aurora awake 24/7, a list endpoint or polling loop that reads `500` documents per visit exhausts the `50,000` daily free reads in `100` visits and scales linearly per read without an auto-pause cap.
