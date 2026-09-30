# PROJECT.md: WCA Badge Generator ("spry")

## 1. Architecture Decision: Monorepo

The WCA Badge Generator is architected as a single monorepo containing `backend/`, `frontend/`, database migrations, infrastructure configuration, and CI/CD pipelines.

### Why Monorepo?
1. **Context Window Preservation for AI Agents & Developers:** The repository represents the entire operational context. In a single pass, an AI agent or engineer can inspect the Pydantic schema, database migration, API route, and the React canvas component consuming it. Splitting into separate repos fragments context and causes contract drift.
2. **Atomic Changes:** Changes to the badge data model, CSV format specifications, or layout coordinates synchronize across frontend and backend in a single commit and pull request.
3. **Frictionless Developer Onboarding:** A new developer clones one repository and runs a single command (`docker compose up --build`) without orchestrating multiple repositories or managing divergent environment variables.

---

## 2. Pinned Technology Stack & Base Images

| Component | Technology | Version / Pinned Base Image | Port |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL | `postgres:16-alpine` | `5432` |
| **Backend API** | FastAPI + SQLAlchemy + Alembic | `python:3.12-slim` | `8000` |
| **Frontend UI** | React + Vite + Tailwind CSS + Lucide | `node:20-alpine` | `5173` |
| **Linter / Formatter (Backend)** | Ruff | `0.3.4` | N/A |
| **Linter / Formatter (Frontend)** | ESLint + Prettier | ESLint 9.x, Prettier 3.x | N/A |

*Strict Constraint:* No Redis, Celery, Nginx, RabbitMQ, or Kubernetes are included in this foundation.

---

## 3. Directory Layout & Folder Responsibilities

```text
.
├── .github/
│   └── workflows/
│       ├── lint.yml              # CI: Ruff (backend) + ESLint/Prettier (frontend)
│       └── deploy.yml            # CD: AWS OIDC deployment triggered on push to main
├── backend/
│   ├── alembic/                  # Alembic migration environment and versioned migration scripts
│   │   ├── versions/             # Reversible, versioned database schema migration files
│   │   └── env.py                # Alembic runtime configuration importing SQLAlchemy models
│   ├── app/
│   │   ├── api/                  # FastAPI HTTP route handlers (contract layer)
│   │   │   ├── badges.py         # Endpoints for badge template layout & badge generation
│   │   │   ├── competitors.py    # Endpoints for CSV upload and participant management
│   │   │   └── roles.py          # Endpoints for role management and styling
│   │   ├── core/                 # Application configuration, database session, settings
│   │   │   ├── config.py         # Pydantic Settings reading environment variables
│   │   │   └── database.py       # SQLAlchemy engine and sessionmaker
│   │   ├── models/               # SQLAlchemy ORM models (table representations)
│   │   │   ├── badge_template.py # Stored badge layouts, canvas size, element positions
│   │   │   ├── competitor.py     # Competitors parsed from CSV
│   │   │   └── role.py           # Custom roles, color schemes, and member assignments
│   │   ├── schemas/              # Pydantic models for request validation and response serialization
│   │   │   ├── badge.py          # Schemas for element properties, dimensions, export
│   │   │   ├── competitor.py     # Competitor import and serialization schemas
│   │   │   └── role.py           # Role creation, update, and style schemas
│   │   ├── services/             # Core business logic
│   │   │   ├── csv_parser.py     # Parses WCA registration CSV exports and splits names
│   │   │   └── pdf_generator.py  # Generates printable PDF badges matching canvas layout
│   │   └── main.py               # FastAPI application entrypoint and CORS middleware
│   ├── alembic.ini               # Alembic database connection configuration
│   ├── Dockerfile                # Multi-stage production & dev Dockerfile for backend
│   ├── pyproject.toml            # Dependencies and Ruff configuration
│   └── requirements.txt          # Pinned Python package dependencies
├── frontend/
│   ├── public/                   # Static assets (default backgrounds, WCA logo, SVG flags)
│   ├── src/
│   │   ├── assets/               # Bundled UI assets and country SVG flag set
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── Canvas.tsx    # Central badge canvas with Figma-like bounding boxes & drag/resize
│   │   │   │   ├── LeftPanel.tsx # General badge settings: CSV/background dropzones, sizes, toggles
│   │   │   │   ├── RightPanel.tsx# Object property inspector: Style, Position (mm), Role management
│   │   │   │   └── TopNav.tsx    # Top bar: Title, Front/Back switch, Generate Badges button
│   │   │   ├── properties/       # Reusable property inspectors
│   │   │   │   ├── AppearanceInspector.tsx # Background, border radius/width, opacity, padding
│   │   │   │   ├── PositionInspector.tsx   # Precision mm coordinates, dimensions, alignment, rotation
│   │   │   │   ├── RoleInspector.tsx       # Role management, styling, and user assignment list
│   │   │   │   └── TypographyInspector.tsx # Font family, size, weight, letter spacing, name display
│   │   │   └── ui/               # Modular UI components (buttons, dropdowns, inputs, sliders, tabs)
│   │   ├── hooks/                # Custom React hooks (useCanvasTransform, useDraggable, useHistory)
│   │   ├── types/                # TypeScript interfaces mirroring backend contracts
│   │   │   ├── badge.ts          # Badge element, layout, and canvas types
│   │   │   └── competitor.ts     # Competitor, Role, and CSV schema types
│   │   ├── utils/                # Measurement conversions (mm to px), CSV parser, SVG handlers
│   │   ├── App.tsx               # Main application container connecting TopNav, Panels, Canvas
│   │   ├── index.css             # Tailwind CSS imports and custom editor styling
│   │   └── main.tsx              # React DOM mounting entrypoint
│   ├── Dockerfile                # Frontend Dockerfile (Vite dev server / production Nginx build)
│   ├── package.json              # Pinned npm dependencies and scripts (lint, build)
│   ├── tailwind.config.js        # Tailwind CSS theme configuration
│   ├── tsconfig.json             # TypeScript compiler options
│   └── vite.config.ts            # Vite bundler configuration and backend proxying
├── docker-compose.yml            # Local orchestration defining postgres, backend, frontend
├── Makefile                      # Standardized local test, lint, and AWS deployment targets
└── README.md                     # Setup instructions and documentation
```

---

## 4. Service Orchestration & Readiness Contracts (`docker-compose.yml`)

### Port Allocation
- **Postgres Database:** `5432:5432`
- **FastAPI Backend:** `8000:8000`
- **React Frontend:** `5173:5173`

### Dependency & Readiness Strategy
`depends_on` alone only guarantees container start order, not service readiness. A database container begins initialising its data directory and refuses socket connections during that window.
To prevent the backend from crashing before Postgres accepts connections, the orchestration must declare an explicit healthcheck:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: spry_badges
      POSTGRES_USER: spry_user
      POSTGRES_PASSWORD: spry_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spry_user -d spry_badges"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://spry_user:spry_password@postgres:5432/spry_badges
      CORS_ORIGINS: http://localhost:5173
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    command: npm run dev -- --host 0.0.0.0
```

---

## 5. Concrete API Contracts (Data & Network Layer)

All endpoints accept and return `application/json` unless otherwise specified. Dates use ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`). Coordinates and dimensions use millimeters (`mm`) with 0.1mm floating point precision.

### 5.1 Competitors & CSV Import

#### `POST /api/competitors/upload-csv`
Uploads a standard WCA registration export CSV file.
- **Request:** `multipart/form-data` with field `file: Binary (CSV)`.
- **Response `200 OK`:**
```json
{
  "total_imported": 42,
  "competitors": [
    {
      "id": "c1a6b0c2-9a3d-4c34-b20b-0447385f1c4e",
      "csv_index": 1,
      "name_latin": "Ihor Shevchenko",
      "name_local": "Ігор Шевченко",
      "name_raw": "Ihor Shevchenko (Ігор Шевченко)",
      "wca_id": "2018SHEV01",
      "country_iso2": "UA",
      "country_name": "Ukraine",
      "role_id": "r-participant",
      "created_at": "2026-09-30T18:00:00Z"
    }
  ]
}
```

#### `GET /api/competitors`
List all imported competitors.
- **Response `200 OK`:** Array of competitor objects formatted as above.

#### `POST /api/competitors/manual`
Creates a manual badge record for someone not present in the registration list (e.g. VIP, Guest, Staff).
- **Request Body:**
```json
{
  "name_latin": "Jane Smith",
  "name_local": "Джейн Сміт",
  "wca_id": null,
  "country_iso2": "UA",
  "country_name": "Ukraine",
  "role_id": "r-organizer"
}
```
- **Response `201 Created`:** Created competitor object.

---

### 5.2 WCA API Integration & Profile Authentication (Organizers & Delegates)

#### `GET /api/wca/oauth/url`
Returns the OAuth2 authorization URL for WCA sign-in (`public manage_competitions` scopes).
- **Response `200 OK`:**
```json
{
  "authorization_url": "https://www.worldcubeassociation.org/oauth/authorize?...",
  "client_id": "...",
  "redirect_uri": "http://localhost:5173/oauth/callback"
}
```

#### `POST /api/wca/oauth/callback`
Exchanges authorization code for access token, fetches profile details, and retrieves managed competitions.
- **Request Body:** `{ "code": "AUTH_CODE" }`
- **Response `200 OK`:**
```json
{
  "access_token": "...",
  "profile": {
    "id": 18942,
    "wca_id": "2018SHEV01",
    "name": "Ihor Shevchenko",
    "avatar_url": "https://...",
    "country_iso2": "UA",
    "delegate_status": "delegate",
    "is_delegate": true,
    "is_organizer": true
  },
  "competitions": [ ... ]
}
```

#### `POST /api/wca/login`
Quick-connect / Personal Access Token endpoint. Allows connecting with a WCA token or selecting verified Delegate / Organizer profiles for testing.
- **Request Body:** `{ "token": "..." }` or `{ "demo_role": "delegate" | "organizer" }`
- **Response `200 OK`:** Same schema as OAuth callback.

#### `GET /api/wca/me`
Returns the connected user's WCA profile.

#### `GET /api/wca/competitions`
Lists all competitions where the authenticated user or organizer/delegate holds a role.
- **Response `200 OK`:**
```json
[
  {
    "id": "KyivSpring2026",
    "name": "Kyiv Spring Cubing 2026",
    "city": "Kyiv",
    "country_iso2": "UA",
    "start_date": "2026-04-18",
    "end_date": "2026-04-19",
    "delegates": ["Ihor Shevchenko"],
    "organizers": ["Dmytro Bondarenko"],
    "is_delegate": true,
    "is_organizer": false
  }
]
```

#### `GET /api/wca/competitions/{comp_id}/registrations`
Fetches live registrations from the WCA API, separated into three strict categories:
1. `approved` (Accepted registrations)
2. `pending` (Awaiting confirmation or on the waitlist)
3. `cancelled` (Rejected, deleted, or cancelled registrations)

- **Response `200 OK`:**
```json
{
  "competition_id": "KyivSpring2026",
  "competition_name": "Kyiv Spring Cubing 2026",
  "approved": [
    {
      "id": "wca-reg-1",
      "user_id": 1,
      "name_latin": "Ihor Shevchenko",
      "name_local": "Ігор Шевченко",
      "name_raw": "Ihor Shevchenko (Ігор Шевченко)",
      "wca_id": "2018SHEV01",
      "country_iso2": "UA",
      "country_name": "Ukraine",
      "status": "accepted",
      "selected": true,
      "competition_id": "KyivSpring2026"
    }
  ],
  "pending": [
    {
      "id": "wca-reg-2",
      "user_id": 2,
      "name_latin": "Artem Zhuravsky",
      "name_local": "Артем Журавський",
      "name_raw": "Artem Zhuravsky (Артем Журавський)",
      "wca_id": "2022ZHUR01",
      "country_iso2": "UA",
      "country_name": "Ukraine",
      "status": "pending",
      "selected": false,
      "competition_id": "KyivSpring2026"
    }
  ],
  "cancelled": [
    {
      "id": "wca-reg-3",
      "user_id": 3,
      "name_latin": "Dmytro Hordiyenko",
      "name_local": "Дмитро Гордієнко",
      "name_raw": "Dmytro Hordiyenko (Дмитро Гордієнко)",
      "wca_id": "2017HORD01",
      "country_iso2": "UA",
      "country_name": "Ukraine",
      "status": "deleted",
      "selected": false,
      "competition_id": "KyivSpring2026"
    }
  ],
  "total_count": 3
}
```

#### `POST /api/wca/competitions/{comp_id}/import`
Imports user-selected registrations into the active badge generator participant list.
- **Request Body:**
```json
{
  "competition_id": "KyivSpring2026",
  "selected_registrations": [ ... ]
}
```
- **Response `200 OK`:** Array of imported competitor objects.

---

### 5.3 Roles & Role Management

#### `GET /api/roles`
Returns all defined roles and their styling presets.
- **Response `200 OK`:**
```json
[
  {
    "id": "r-participant",
    "name": "Participant",
    "is_default": true,
    "style": {
      "font_family": "Inter",
      "font_size": 14,
      "font_weight": "600",
      "italic": false,
      "text_align": "center",
      "text_color": "#FFFFFF",
      "background_color": "#2563EB",
      "border_radius": 4.0,
      "border_width": 0.0,
      "border_color": "#000000",
      "opacity": 1.0
    },
    "assigned_competitor_ids": ["c1a6b0c2-9a3d-4c34-b20b-0447385f1c4e"]
  }
]
```

#### `POST /api/roles`
Create a new custom role.
- **Request Body:**
```json
{
  "name": "Delegate",
  "style": {
    "font_family": "Inter",
    "font_size": 14,
    "font_weight": "700",
    "italic": false,
    "text_align": "center",
    "text_color": "#FFFFFF",
    "background_color": "#DC2626",
    "border_radius": 4.0,
    "border_width": 0.0,
    "border_color": "#000000",
    "opacity": 1.0
  }
}
```
- **Response `201 Created`:** Created role object with assigned ID.

#### `PUT /api/roles/{role_id}/assign`
Assigns or reassigns a participant to a role.
- **Request Body:**
```json
{
  "competitor_id": "c1a6b0c2-9a3d-4c34-b20b-0447385f1c4e"
}
```
- **Response `200 OK`:** Updated role object.

---

### 5.3 Badge Templates & Layout Configuration

#### `GET /api/templates/current`
Returns active badge configuration for Front and Back sides.
- **Response `200 OK`:**
```json
{
  "dimensions": {
    "preset": "100x70",
    "width_mm": 100.0,
    "height_mm": 70.0
  },
  "sides": {
    "front": {
      "background_url": "/static/backgrounds/front.png",
      "elements": [
        {
          "id": "elem-name",
          "type": "name",
          "enabled": true,
          "name_display": "latin_only",
          "position": {
            "x_mm": 10.0,
            "y_mm": 35.0,
            "width_mm": 80.0,
            "height_mm": 12.0,
            "rotation_deg": 0.0,
            "z_index": 2
          },
          "style": {
            "font_family": "Inter",
            "font_size": 20,
            "font_weight": "700",
            "italic": false,
            "uppercase": true,
            "text_align": "center",
            "letter_spacing_mm": 0.2,
            "text_color": "#111827",
            "has_background": false,
            "background_color": "#FFFFFF",
            "border_radius": 0.0,
            "border_width": 0.0,
            "border_color": "#000000",
            "opacity": 1.0,
            "padding_mm": 0.0
          }
        },
        {
          "id": "elem-wca-id",
          "type": "wca_id",
          "enabled": true,
          "format_mode": "prefix_label",
          "format_prefix": "WCA ID: ",
          "format_suffix": "",
          "position": { "x_mm": 10.0, "y_mm": 48.0, "width_mm": 80.0, "height_mm": 8.0, "rotation_deg": 0.0, "z_index": 3 },
          "style": { "font_family": "Inter", "font_size": 12, "font_weight": "500", "italic": false, "uppercase": false, "text_align": "center", "letter_spacing_mm": 0.0, "text_color": "#4B5563", "has_background": false, "background_color": "#FFFFFF", "border_radius": 0.0, "border_width": 0.0, "border_color": "#000000", "opacity": 1.0, "padding_mm": 0.0 }
        },
        {
          "id": "elem-country-flag",
          "type": "flag",
          "enabled": true,
          "position": { "x_mm": 44.0, "y_mm": 12.0, "width_mm": 12.0, "height_mm": 8.0, "rotation_deg": 0.0, "z_index": 1 },
          "opacity": 1.0
        },
        {
          "id": "elem-role",
          "type": "role",
          "enabled": true,
          "position": { "x_mm": 20.0, "y_mm": 58.0, "width_mm": 60.0, "height_mm": 7.0, "rotation_deg": 0.0, "z_index": 4 }
        },
        {
          "id": "elem-comp-id",
          "type": "competition_id",
          "enabled": true,
          "format_mode": "raw",
          "format_prefix": "",
          "format_suffix": "",
          "position": { "x_mm": 85.0, "y_mm": 5.0, "width_mm": 10.0, "height_mm": 6.0, "rotation_deg": 0.0, "z_index": 5 },
          "style": { "font_family": "Inter", "font_size": 10, "font_weight": "400", "italic": false, "uppercase": false, "text_align": "right", "letter_spacing_mm": 0.0, "text_color": "#9CA3AF", "has_background": false, "background_color": "#FFFFFF", "border_radius": 0.0, "border_width": 0.0, "border_color": "#000000", "opacity": 1.0, "padding_mm": 0.0 }
        }
      ]
    },
    "back": {
      "background_url": null,
      "elements": []
    }
  }
}
```

#### `PUT /api/templates/current`
Saves updated badge layout, dimensions, or object properties.

---

### 5.4 Badge Export

#### `POST /api/badges/export-pdf`
Generates a print-ready vector PDF containing all attendee badges according to canvas specifications.
- **Request Body:** `{ "template_id": "current", "side": "both" | "front" | "back" }`
- **Response `200 OK`:** `application/pdf` binary stream.

---

## 6. Frontend Interaction & UI Specification

### 6.1 Top Bar
- **Left:** Brand title `"WCA Badge Generator"` in bold blue text.
- **Center:** Segmented toggle for badge side (`[ Front ] [ Back ]`).
- **Right:** Primary action button `"Generate Badges"` (triggers PDF compilation modal & download).

### 6.2 Left Panel: General Badge Settings
- **Dropzones:**
  - Background image dropzone (supports PNG/JPG/SVG preview).
  - CSV file dropzone with instant parsing and error diagnostics.
- **Participant Carousel:**
  - Previous (`<`) and Next (`>`) controls.
  - Counter: `"Participant {current} of {total}"` to immediately review how actual participant data renders on the canvas.
- **Badge Dimensions:**
  - Dropdown presets: `A6 (105x148mm)`, `100x70mm`, `90x70mm`, `Custom`.
  - Selecting `Custom` reveals `Width (mm)` and `Height (mm)` numerical inputs (clamped to max `200x200mm`).
- **Field Visibility Toggles:**
  - Name, WCA ID, Country, Competition ID, Role.
  - Toggling adds/removes the component from the canvas.

### 6.3 Center Canvas: Interactive Editor
- **Boundary Display:** Scaled canvas representing exact aspect ratio; top-left corner displays active dimensions in mm (e.g. `100.0 mm × 70.0 mm`).
- **Object Manipulation:**
  - Bounding box with selection handles (Figma-style).
  - Drag-to-move with boundary constraints.
  - Resize handles (corners and edges).
  - Delete / "Throw the piece" action (drag element outside canvas or press Delete/Backspace or click trash icon).
- **Pixel-to-Millimeter Precision:**
  - Fixed virtual DPI conversion (`1 mm = 3.7795 px`).
  - Screen rendering and exported PDF vectors share identical proportional coordinates.

### 6.4 Right Panel: Properties Inspector
- **Name Object Properties:**
  - *Style Tab:*
    - Typography: Font Family, Font Size, Font Weight, Italic toggle, Uppercase toggle, Alignment (Left, Center, Right), Letter Spacing (slider + input), Name Display dropdown (`Latin Only`, `Local Only`, `Both`), Text Color picker.
    - Appearance: `Has Background` toggle. When enabled: Background Color, Border Radius, Border Width & Color, Opacity, Padding.
  - *Position Tab:*
    - X and Y coordinates (mm, 0.1mm precision).
    - Horizontal Alignment (Left, Center, Right) & Vertical Alignment (Top, Center, Bottom).
    - Width & Height (mm, 0.1mm precision).
    - Rotation slider (0°–360°) and numeric input.
    - Layer ordering buttons (Bring Forward, Send Backward, Bring to Front, Send to Back).
- **WCA ID & Competition ID Properties:**
  - Identical to Name, with "Name Display" replaced by "Format" selector:
    - WCA ID: `"WCA ID: [WCA ID]"`, `"WCA ID"`, or `"Custom"` (with manual prefix and suffix inputs).
    - Competition ID: `"ID: [ID]"`, `"ID"`, or `"Custom"` (with manual prefix and suffix inputs).
- **Role Management Properties:**
  - "Add New Role" input field with `+` button.
  - Pre-existing "Participant" role (default for all competitors).
  - Style configuration per role: Background color, text color, Font size, Border radius, Font family, Font weight, Text Alignment, Italic, Opacity, Border.
  - "Assigned Users" section: List of participants. Active role members display a green checkmark icon; unassigned/other role members display a `+` button to reassign them to the active role.
- **Flag / Country Properties:**
  - Flags rendered as high-fidelity SVGs.
  - Position tab and Opacity slider only.

---

## 7. Makefile Deploy & Verification Contract

```makefile
.PHONY: dev lint test deploy-frontend deploy-backend

dev:
	docker compose up --build

lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint

test:
	cd backend && pytest
	cd frontend && npm test

deploy-frontend:
	cd frontend && npm run build
	aws s3 sync frontend/dist s3://$(S3_BUCKET_NAME) --delete
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths "/*"

deploy-backend:
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REPO_URL)
	docker build -t $(ECR_REPO_URL):$(COMMIT_SHA) ./backend
	docker push $(ECR_REPO_URL):$(COMMIT_SHA)
	aws ecs update-service --cluster $(ECS_CLUSTER) --service $(ECS_SERVICE) --force-new-deployment
```

---

## 8. AWS Production Architecture & CI/CD Pipeline

```mermaid
flowchart LR
    subgraph Client ["Client Browser"]
        User["User"]
    end

    subgraph AWS ["AWS Cloud"]
        subgraph Edge ["Route 53 & Edge"]
            R53["Route 53 DNS<br/>(Custom Domain)"]
            CF["CloudFront CDN<br/>(HTTPS / ACM Certificate)"]
            ALB["Application Load Balancer<br/>(HTTPS / ACM Certificate)"]
        end

        subgraph Storage ["Static Storage"]
            S3["S3 Bucket<br/>(Private Frontend Bundle)"]
        end

        subgraph Compute ["Container Compute"]
            ECS["ECS Fargate Tasks<br/>(FastAPI Backend)"]
            ECR["ECR Registry<br/>(Tagged by Commit SHA)"]
        end

        subgraph DB ["Database"]
            RDS["Amazon RDS PostgreSQL<br/>(Private Subnet)"]
        end
    end

    User -->|app.yourdomain.com| R53
    User -->|api.yourdomain.com| R53
    R53 --> CF
    R53 --> ALB
    CF -->|Origin Access Control (OAC)| S3
    ALB -->|Healthcheck /api/health| ECS
    ECS -->|SQLAlchemy| RDS
    ECR -.->|Pulls Image| ECS
```

### GitHub Actions OIDC Authentication
No long-lived AWS Access Keys are stored in GitHub secrets. Deployment uses `aws-actions/configure-aws-credentials@v4` with OpenID Connect (OIDC), assuming an IAM Role bound strictly to the repository and `main` branch.
