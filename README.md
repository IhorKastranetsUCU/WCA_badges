# Spry: WCA Badge Generator 🪪⚡

A full-stack, production-grade monorepo web application designed to generate, preview, customize, and export competition badges for World Cube Association (WCA) speedcubing events.

---

## 1. Quick Start (Single Command)

To run the entire stack locally (Postgres, FastAPI backend with Alembic migrations, and React Vite frontend):

```bash
docker compose up --build
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database:** `localhost:5432` (`spry_badges`)

### WCA OAuth Setup (1-Click Local Login)
To authorize with your real World Cube Association account on `localhost`:
1. Open your application in the [WCA Developer Portal](https://www.worldcubeassociation.org/oauth/applications).
2. Under **Redirect URIs / Callback URLs**, add:
   ```text
   http://localhost:5173/
   ```
   (In addition to `https://v0-wcabadgegenerator3.vercel.app/api/auth/callback/wca`)
3. Save the application. Now clicking **"Sign In with World Cube Association"** on `http://localhost:5173` will automatically log you in without any manual code copying!

---

## 2. Architecture & Monorepo Rationale

### Why a Monorepo?
1. **Context Window Preservation:** In modern development with AI coding agents and lean engineering teams, keeping `backend/`, `frontend/`, database schemas, and CI in one tree allows complete visibility in a single pass. Splitting into multiple repositories fragments context, forcing agents and developers to guess API and schema contracts.
2. **Atomic Schema and Contract Changes:** When a field changes in the badge model or CSV parser, a single commit synchronizes the database migration, the Pydantic schema, the FastAPI endpoint, and the React UI.
3. **Reproducibility:** A new team member runs `docker compose up --build` and has a fully working environment with health-checked dependencies in minutes.

---

## 3. Technology Stack & Pinned Base Images

- **Database:** PostgreSQL 16 (`postgres:16-alpine`)
- **Backend:** Python 3.12 (`python:3.12-slim`), FastAPI, SQLAlchemy 2.0 (async), Alembic, ReportLab
- **Frontend:** Node 20 (`node:20-alpine`), React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, jsPDF
- **Linters:** `ruff` (backend), `eslint` + `prettier` (frontend)
- **Infrastructure:** Docker Compose (local), AWS ECS Fargate, ECR, S3, CloudFront, ALB, GitHub Actions OIDC (cloud)

---

## 4. Key Application Features

### Top Navigation
- Title: **"WCA Badge Generator"** in bold blue text.
- Badge side selector: **[ Front ]** and **[ Back ]**.
- Primary action: **"Generate Badges"** for batch vector PDF export.

### Three-Container Editor Layout
1. **Left Panel (General Settings & Live WCA Integration):**
   - **WCA Competition Import (Live):** Organizers and Delegates can view competitions where they hold a role, load registrations directly from the WCA API, and review attendees structured into 3 distinct categories:
     - 🟢 **Approved:** Confirmed, accepted competitors.
     - 🟡 **Pending:** Waitlisted or pending approval.
     - 🔴 **Cancelled / Rejected:** Deleted or cancelled registrations.
   - **Manual Attendee Selection:** Checkboxes and category-wide selection allow organizers to handpick exactly which attendees receive badges.
   - **+ Add Custom Badge Attendee:** Create badges on the fly for VIPs, guests, staff, delegates, or late registrants not present in the official WCA registration list.
   - Drag-and-drop areas for background artwork and WCA registration CSV exports.
   - Participant carousel (`<` and `>`) with `"Participant X of Y"` counter.
   - Badge size selector: `A6 (105x148mm)`, `100x70mm`, `90x70mm`, and `Custom` (with width & height inputs up to 200x200mm).
   - Component visibility toggles: Name, WCA ID, Country, Competition ID, Role.
2. **Central Canvas (Interactive Preview):**
   - Dimension indicator in mm in the top-left corner.
   - Figma-like drag and resize bounding boxes with corner handles.
   - Boundary clamping inside the badge area.
   - Element removal / "throw the piece" delete action.
3. **Right Panel (Properties Inspector):**
   - **Name:** Typography (Font Family, Size, Weight, Italic, Uppercase, Alignment, Letter Spacing, Name Display: Latin Only / Local Only / Both) + Appearance (Has Background, BG Color, Border Radius/Width/Color, Opacity, Padding) + Position (X, Y mm, alignments, W, H mm, rotation, layer order).
   - **WCA ID & Competition ID:** Same typography/appearance/position plus Format dropdown (`"WCA ID: [...]"`, `"WCA ID"`, `"Custom"`).
   - **Role Management:** "Add New Role", default "Participant" role, custom role styling, and "Assigned Users" list with active checkmark and reassignment `+` buttons.
   - **Country / Flag:** High-resolution SVG flags with Position and Opacity controls.

---

## 5. Lab Discussion Questions & Answers

### The Compose File
- **`image` vs `build`:** `image` pulls a pre-existing container image from a public or private registry (e.g., `postgres:16-alpine`), whereas `build` tells Docker to build a local image using a `Dockerfile` found in a directory context (e.g., `./backend`).
- **`ports` vs `expose`:** `ports` (`8000:8000`) binds the container port to the host network interface so it can be reached from your laptop's browser. `expose` only documents or makes the port accessible to other containers on the same Docker network without exposing it to the host.
- **Development vs. Production lines in Compose:** Mount volumes like `- ./backend:/app` and `--reload` flags exist purely for local hot-reloading. In production, code is baked into the immutable image, and containers run without source-code bind mounts or debug reloaders.
- **How does a service wait for another?** `depends_on` alone only orders container startup, not application readiness. PostgreSQL starts initializing its data directory before it accepts TCP connections. By using `healthcheck` (`pg_isready`) and `depends_on: postgres: condition: service_healthy`, Docker Compose ensures the database is fully ready before launching the backend and running migrations.
- **Dockerfile vs docker-compose.yml:** The `Dockerfile` packages a single service into an immutable container image (survives ECS, Cloud Run, Kubernetes). `docker-compose.yml` orchestrates multiple containers, networking, and volumes locally for development.
- **Base image selection (`python:3.12-slim` vs standard vs Alpine):** `python:3.12-slim` excludes heavy build tools (compilers, documentation) saving ~800MB while keeping Debian glibc compatibility (preventing wheel compilation errors). Alpine uses musl libc, which can cause subtle runtime bugs and slow wheel builds in Python, while full Debian is unnecessarily bloated.

### The Backend & Migrations
- **Structure of `backend/`:** Separation of concerns:
  - `api/`: HTTP routing, status codes, query/body parsing.
  - `schemas/`: Pydantic input/output validation contracts.
  - `models/`: SQLAlchemy database schema representations.
  - `services/`: Pure business logic (CSV parsing, PDF generation) independent of the web framework.
- **SQLAlchemy ORM vs Raw SQL:** SQLAlchemy provides type safety, unit-of-work transaction management, and dialect abstraction. Raw SQL offers ultimate query optimization, but ORM abstractions prevent SQL injection and decouple schema definitions from physical storage engines.
- **Alembic vs `Base.metadata.create_all()`:** `create_all()` only creates missing tables once; it cannot alter existing columns, rename tables, or migrate existing production data without dropping tables. Alembic creates versioned, reviewable, reversible migration scripts suitable for zero-downtime production releases. Migrations run in compose via `alembic upgrade head` before the backend server starts.

### Cloud & AWS Deployment
- **Why CloudFront if S3 serves HTTP?** S3 static web hosting lacks global edge caching, DDoS protection, custom TLS certificates for root/subdomains, and HTTP/3 support. CloudFront caches assets close to the user and allows keeping the S3 bucket private via Origin Access Control (OAC).
- **ECR vs ECS:** ECR (Elastic Container Registry) is where container images are stored (like GitHub for Docker images). ECS (Elastic Container Service) is the compute orchestrator that pulls images from ECR and runs them on Fargate or EC2 instances.
- **Health Checks in ALB:** ALB sends periodic HTTP requests (e.g., `GET /api/health`). If a container fails consecutive health checks, ALB stops routing traffic to it and instructs ECS to terminate and replace the unhealthy task.
- **CNAME for validation vs routing:**
  - *Validation:* DNS-01 challenge where ACM issues a unique CNAME to prove domain ownership before issuing an SSL/TLS certificate.
  - *Routing:* Directs user traffic (`api.yourdomain.com` -> ALB DNS, `app.yourdomain.com` -> CloudFront distribution).
- **OIDC vs Long-lived Access Keys:** Long-lived IAM access keys can be leaked, stolen, or shared, granting perpetual access until manually revoked. GitHub Actions OIDC uses short-lived, cryptographically signed JSON Web Tokens (JWT) exchanged with AWS STS (`AssumeRoleWithWebIdentity`) that expire immediately after the pipeline finishes.

---

## 6. Local Development Commands

```bash
# Start all services
make dev

# Run linters (Ruff + ESLint)
make lint

# Run automated tests
make test

# Tear down containers and clean volumes
make clean
```