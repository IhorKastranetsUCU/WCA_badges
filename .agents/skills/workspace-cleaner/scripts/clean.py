#!/usr/bin/env python3
"""
Workspace Cleaner Script
Safely cleans temporary files, OS metadata, build caches, and compiler artifacts
from any specified directory.

Usage:
    python3 clean.py [--path /path/to/folder] [--dry-run] [--aggressive]
"""

import os
import shutil
import argparse
from pathlib import Path

# Directories to remove recursively
TARGET_DIRS = {
    # Python
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    "htmlcov",
    ".tox",
    # JavaScript / Web
    ".turbo",
    ".parcel-cache",
    ".next/cache",
    # General Cache
    ".cache",
}

# Specific files or pattern extensions to remove
TARGET_FILES = {
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".coverage",
    ".eslintcache",
}

TARGET_EXTENSIONS = (
    ".pyc",
    ".pyo",
    ".swp",
    ".swo",
    "~",
    ".tmp",
    ".bak",
)

def format_size(bytes_val: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} TB"

def get_dir_size(path: Path) -> int:
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file(follow_symlinks=False):
                total += entry.stat().st_size
            elif entry.is_dir(follow_symlinks=False):
                total += get_dir_size(Path(entry.path))
    except (PermissionError, FileNotFoundError):
        pass
    return total

def clean_workspace(root_dir: str, dry_run: bool = False, aggressive: bool = False):
    root = Path(root_dir).resolve()
    if not root.exists():
        print(f"Error: Directory '{root}' does not exist.")
        return

    print(f"{'Scanning (DRY RUN)' if dry_run else 'Cleaning'} workspace: {root}\n")

    total_bytes_freed = 0
    deleted_items = []

    # 1. Scan for matching directories
    for current_dir, dirs, files in os.walk(root, topdown=False):
        current_path = Path(current_dir)
        
        # Check subdirectories
        for d in list(dirs):
            dir_path = current_path / d
            # Don't touch .git or node_modules unless explicitly intended
            if d in [".git", "node_modules", ".venv", "venv"]:
                continue

            if d in TARGET_DIRS or any(d.endswith(ext) for ext in [".cache"]):
                size = get_dir_size(dir_path)
                total_bytes_freed += size
                deleted_items.append((dir_path, size, "dir"))
                if not dry_run:
                    try:
                        shutil.rmtree(dir_path)
                    except Exception as e:
                        print(f"Warning: Could not remove directory {dir_path}: {e}")

        # Check files
        for f in files:
            file_path = current_path / f
            should_delete = False

            if f in TARGET_FILES:
                should_delete = True
            elif f.startswith("._"): # Mac hidden attribute files
                should_delete = True
            elif any(f.endswith(ext) for ext in TARGET_EXTENSIONS):
                should_delete = True

            if should_delete:
                try:
                    size = file_path.stat().st_size
                except (FileNotFoundError, PermissionError):
                    size = 0
                total_bytes_freed += size
                deleted_items.append((file_path, size, "file"))
                if not dry_run:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        print(f"Warning: Could not remove file {file_path}: {e}")

    # Output summary
    if not deleted_items:
        print("✨ Workspace is already squeaky clean! No temporary or cache files found.")
        return

    print(f"{'Found' if dry_run else 'Cleaned'} {len(deleted_items)} junk/cache items:")
    for item_path, size, item_type in deleted_items[:20]:
        rel_path = item_path.relative_to(root) if item_path.is_relative_to(root) else item_path
        print(f"  - [{item_type.upper()}] {rel_path} ({format_size(size)})")

    if len(deleted_items) > 20:
        print(f"  ... and {len(deleted_items) - 20} more items.")

    action_word = "Recoverable" if dry_run else "Successfully freed"
    print(f"\n🎉 Total disk space {action_word}: {format_size(total_bytes_freed)}")

def main():
    parser = argparse.ArgumentParser(description="Safely clean project workspaces and remove temporary files.")
    parser.add_argument("--path", "-p", default=".", help="Target directory path to clean (default: current directory)")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Perform a dry run without deleting files")
    parser.add_argument("--aggressive", "-a", action="store_true", help="Aggressive mode (also clean build/dist folders)")
    args = parser.parse_args()

    clean_workspace(args.path, dry_run=args.dry_run, aggressive=args.aggressive)

if __name__ == "__main__":
    main()
