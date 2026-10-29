# ADR 0007: Multimodal AI Badge Auto-Layout (Vision-Assisted Canvas Framing)

## Status
**Accepted** (2026-10-29)

---

## 1. Context & Problem Statement

In the **WCA Badge Generator ("spry")**, competition organizers upload custom badge artwork (PNG/JPG designs featuring event logos, decorative headers, sponsor strips, or dark/light themes). Previously, every badge element (`name`, `wca_id`, `flag`, `role`, `competition_id`, `avatar`, `qr_code`, `schedule`) started at static default coordinates, forcing organizers to manually drag, resize, and recolor each field to avoid overlapping artwork or losing text contrast.

We need an **AI Auto-Layout** capability ("Автоматичне розкадрування") that inspects the uploaded badge artwork and automatically arranges all active elements into clean negative space with readable contrast, while keeping the human organizer in full control.

### Architectural Constraints
1. **Model Suggests, Human Decides:** AI must never overwrite the database directly. It proposes coordinates and styles onto the interactive React Canvas, flags them with `✨ AI` badges, supports 1-click **Undo**, and lets the organizer drag/adjust any element before clicking **Save Layout**.
2. **Secret Hygiene & Zero Idle Cost:** API keys (`GEMINI_API_KEY`) must never be committed to source control (loaded strictly via gitignored `.env` locally and `NoEcho: true` parameters in CloudFormation). Stateless inference runs outside the VPC ($0.00 idle cost).
3. **Visual Prompt Injection & Geometry Safety:** Uploaded images or organizer layout hints (`<design_note>`) are untrusted inputs that could contain adversarial instructions (e.g., placing white text on a white background or pushing coordinates off-canvas).

---

## 2. Decision

1. **Stateless Multimodal Vision Engine (`backend/app/ai/badge_layout.py`):**
   - Primary inference uses **Google Gemini Vision** (`gemini-3-flash-preview` with `thinkingLevel="MINIMAL"` and structured `responseSchema`, automatically falling back to `gemini-3.1-flash-lite` on timeout/5xx, and supporting **Amazon Bedrock Converse Vision** `amazon.nova-pro-v1:0` when AWS Bedrock models are selected).
   - Before calling the model, Pillow validates the raster image, downscales it to max `768px` JPEG (~1,120 image tokens), computes an objective `5x5` perceived luminance grid (`0..255`), and runs median-cut color quantization (`extract_image_palette`) to extract real pixel-sampled dominant swatches, vibrant brand accents, and deep brand-tinted ink colors.
   - The model matches **typography** (`Playfair Display` / `Georgia` for classic/royal crests, `Oswald` / `Impact` for bold esports posters, `Montserrat` + `JetBrains Mono` for modern geometric/cyber speedcubing badges, `Inter` / `Roboto` / `Open Sans` for Swiss minimal layouts) alongside **brand palette colors** for text elements, the Role Badge pill (`role_style`), QR modules, and Avatar borders.

2. **Deterministic Post-Inference Guardrails (`_refine_and_clamp_suggestion`):**
   - **Schema Validation & Retry:** Output is validated against Pydantic `BadgeLayoutSuggestion` (with one automatic error-feedback retry if validation fails).
   - **ID & Boundary Clamping:** Unknown/hallucinated element IDs are stripped; all bounding boxes are clamped inside a `2.0 mm` print-safe margin; minimum scannable sizes are enforced for QR codes (`>= 15x15 mm`) and flags (`~3:2` ratio).
   - **Brand-Preserving WCAG Contrast Protection:** Actual pixel luminance under each text element is compared against `text_color` (and Role pill / QR background luminance). Brand-tinted inks (e.g., deep burgundy, navy, emerald, amber, cream) are preserved whenever contrast is readable, while unreadable low-contrast or injected colors are automatically corrected toward the template's deep brand ink or crisp white.

3. **Separation of Suggestion and Persistence:**
   - Suggestion endpoint: `POST /api/ai/badge-layout` (and outside-VPC Lambda Function URL `action="badge_layout"`). Logs structured JSON telemetry (`event="badge_layout_suggested"`, `model`, `prompt_version`, `input_tokens`, `output_tokens`, `latency_ms`, `cost_usd`).
   - Persistence endpoint: `PUT /api/badges/templates/current` stores the human-verified layout alongside `ai_suggestion` JSON metadata in `badge_templates.ai_suggestion` for continuous quality evaluation.

---

## 3. Consequences

- **Latency & Cost:** ~2.3–2.6 seconds per badge layout at **~$0.00041 USD** per call (~1,220 input tokens, ~380 output tokens on `gemini-3-flash-preview`).
- **Graceful Degradation:** If the AI Vision API is unreachable or throttled, the organizer receives a clear Ukrainian diagnostic banner in `LeftPanel` and continues positioning elements manually on the Figma-like Canvas without any disruption to PDF badge generation.
