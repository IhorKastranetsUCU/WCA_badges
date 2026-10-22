import argparse
import json
import sys
from datetime import date

from app.ai.agenda import cost_usd, parse_agenda
from app.core.config import settings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse unstructured text into a structured meeting agenda."
    )
    parser.add_argument("text", nargs="?", default="", help="Text to parse")
    parser.add_argument(
        "--today", default=date.today().isoformat(), help="Reference today date (YYYY-MM-DD)"
    )
    parser.add_argument("--tz", default="Europe/Kyiv", help="Timezone")
    parser.add_argument("--model", default=settings.PARSER_MODEL, help="Model ID override")
    args = parser.parse_args()

    input_text = args.text
    if not input_text:
        if not sys.stdin.isatty():
            input_text = sys.stdin.read()
        else:
            print("Error: No text provided. Pass TEXT='...' or pipe to stdin.", file=sys.stderr)
            sys.exit(1)

    today = date.fromisoformat(args.today)
    print(f"Parsing agenda with model '{args.model}' (Today: {today}, TZ: {args.tz})...\n")

    try:
        agenda, usage = parse_agenda(input_text, today, args.tz, model=args.model)
        calculated_cost = cost_usd(args.model, usage)
        result = {
            "agenda": agenda.model_dump(mode="json"),
            "usage": usage,
            "cost_usd": calculated_cost,
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error parsing agenda: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
