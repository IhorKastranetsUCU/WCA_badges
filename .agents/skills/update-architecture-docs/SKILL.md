---
name: update-architecture-docs
description: >-
  Keep ARCHITECTURE.md documentation, diagrams, and evolution changelogs in sync with recent code changes.
  Use whenever new features, endpoints, database models, frontend components, or infrastructure templates are added, modified, or removed.
---

# Update Architecture Documentation Skill

This skill guides the agent on how to keep `ARCHITECTURE.md` accurate, comprehensive, and up-to-date after any code modifications.

---

## When to Use This Skill
Activate this skill whenever:
* New API endpoints or HTTP routes are added in `backend/app/api/`.
* SQLAlchemy models or database tables are modified in `backend/app/models/` or migrations in `backend/alembic/versions/`.
* New React components, panels, or modals are created in `frontend/src/components/`.
* AWS infrastructure templates are updated in `infra/` or Docker/Compose setups change.
* Core services (e.g. PDF generation, AI parsing, background reporting) undergo architectural refactoring.

---

## Step-by-Step Procedure

### 1. Identify Architectural Changes
Run a quick status and diff check to see what files were modified or added:
```bash
git status --short
# or compare against last commit
git diff --stat HEAD~1
```

### 2. Map Changes to Architectural Sections
Inspect the affected areas and identify which sections in `ARCHITECTURE.md` need updates:

| Changed Directory / File | Affected Section in `ARCHITECTURE.md` | Action Needed |
| :--- | :--- | :--- |
| `backend/app/api/*.py` | Section 4.2 (Backend Layer) & Section 3 (Sequence Diagram) | Add new route to endpoint list and update sequence diagram if user-facing. |
| `backend/app/models/*.py` | Section 4.3 (Database Schema) | Update Mermaid ER diagram with new entity/attributes/relationships. |
| `frontend/src/components/*` | Section 4.1 (Frontend Layer) | Document new UI components, modals, or user workflows. |
| `infra/*.yml` | Section 4.4 (Cloud & Serverless Infrastructure) | Update AWS service list, event flows, or CloudFormation templates. |
| `backend/app/services/*` | Section 4.2 (Backend Services) | Detail newly introduced business logic, engines, or background jobs. |

### 3. Update Visual Mermaid Diagrams
If communication flows or component boundaries have evolved:
* Review `flowchart TD` in Section 2 (High-Level Architecture).
* Review `sequenceDiagram` in Section 3 (User Walkthrough).
* Review `erDiagram` in Section 4.3 (Database Schema).
* Ensure valid Mermaid syntax (e.g. quote labels with parentheses or special characters).

### 4. Append to the Architecture Evolution Log (Changelog)
Every architectural change **must** be logged in Section 6 ("Architecture Evolution Log").

Use the helper script:
```bash
python3 .agents/skills/update-architecture-docs/scripts/update_arch_log.py \
  --title "Brief Feature Name" \
  --summary "Concise 1-2 sentence description of what was changed and why" \
  --components "frontend/src/components/..., backend/app/..."
```

### 5. Synchronize Mirrors
If the repository has a clone or submodule (e.g. `WCA_badges/`):
```bash
cp ARCHITECTURE.md WCA_badges/ARCHITECTURE.md 2>/dev/null || true
```
