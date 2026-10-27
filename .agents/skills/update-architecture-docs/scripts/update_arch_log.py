#!/usr/bin/env python3
"""
Architecture Documentation Helper Script
Scans for recent git changes and appends an entry to the Architecture Evolution Log
in ARCHITECTURE.md.

Usage:
    python3 update_arch_log.py --title "Feature Name" --summary "Summary of changes" --components "backend, frontend"
"""

import sys
import argparse
from datetime import datetime
from pathlib import Path

def append_changelog_entry(arch_path: Path, title: str, summary: str, components: str):
    if not arch_path.exists():
        print(f"Error: {arch_path} does not exist.")
        sys.exit(1)

    content = arch_path.read_text(encoding="utf-8")
    
    # Format entry
    date_str = datetime.now().strftime("%b %Y")
    new_row = f"| **{date_str}** | **{title}** | {summary} | `{components}` |\n"

    target_marker = "| :--- | :--- | :--- | :--- |\n"
    if target_marker in content:
        # Insert right after header separator
        parts = content.split(target_marker, 1)
        updated_content = parts[0] + target_marker + new_row + parts[1]
    else:
        # Fallback to end of file
        updated_content = content + "\n" + new_row

    arch_path.write_text(updated_content, encoding="utf-8")
    print(f"Successfully added log entry to {arch_path}")

def main():
    parser = argparse.ArgumentParser(description="Append entry to ARCHITECTURE.md evolution log.")
    parser.add_argument("--path", "-p", default="ARCHITECTURE.md", help="Path to ARCHITECTURE.md")
    parser.add_argument("--title", "-t", required=True, help="Milestone / Feature title")
    parser.add_argument("--summary", "-s", required=True, help="Summary of changes")
    parser.add_argument("--components", "-c", required=True, help="Impacted components (e.g. backend/app/api, infra/)")
    args = parser.parse_args()

    arch_path = Path(args.path).resolve()
    append_changelog_entry(arch_path, args.title, args.summary, args.components)

if __name__ == "__main__":
    main()
