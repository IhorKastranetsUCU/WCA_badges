import base64
import json
import sys
import time
from pathlib import Path

from app.ai.badge_layout import (
    LAYOUT_PROMPT_VERSION,
    LayoutElementSpec,
    analyze_badge_layout,
    layout_cost_usd,
)

DEFAULT_ELEMENTS = [
    LayoutElementSpec(id="elem-flag", type="flag", label="Country Flag"),
    LayoutElementSpec(id="elem-name", type="name", label="Participant Name"),
    LayoutElementSpec(id="elem-wca-id", type="wca_id", label="WCA ID"),
    LayoutElementSpec(id="elem-role", type="role", label="Role Badge"),
    LayoutElementSpec(id="elem-comp-id", type="competition_id", label="Registrant ID"),
]


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m app.ai.layout_cli <path/to/badge_bg.png> [width_mm] [height_mm]")
        sys.exit(1)

    img_path = Path(sys.argv[1])
    if not img_path.exists():
        print(f"Error: Image file not found: {img_path}", file=sys.stderr)
        sys.exit(1)

    width_mm = float(sys.argv[2]) if len(sys.argv) > 2 else 100.0
    height_mm = float(sys.argv[3]) if len(sys.argv) > 3 else 70.0

    b64 = base64.b64encode(img_path.read_bytes()).decode("ascii")
    started = time.monotonic()
    suggestion, usage, active_model = analyze_badge_layout(
        image_base64=b64,
        width_mm=width_mm,
        height_mm=height_mm,
        elements=DEFAULT_ELEMENTS,
    )
    latency_ms = int((time.monotonic() - started) * 1000)
    cost = layout_cost_usd(active_model, usage)

    print(
        json.dumps(
            {
                "suggestion": suggestion.model_dump(mode="json"),
                "model": active_model,
                "prompt_version": LAYOUT_PROMPT_VERSION,
                "usage": usage,
                "latency_ms": latency_ms,
                "cost_usd": cost,
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
