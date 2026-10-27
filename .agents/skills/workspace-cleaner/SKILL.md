---
name: workspace-cleaner
description: >-
  Clean up unnecessary, unused, stale, cache, and temporary files from any project folder or directory on PC.
  Use when the user asks to clean a folder, remove cache, delete temporary files, or free up disk space in a repository.
---

# Workspace Cleaner Skill

This skill provides automated and safe cleanup of development workspaces, project folders, and directories across macOS, Linux, and Windows.

## What Gets Cleaned
1. **OS Metadata & Junk:** `.DS_Store`, `Thumbs.db`, `desktop.ini`, `._*` AppleDouble files.
2. **Python Cache & Bytecode:** `__pycache__`, `*.pyc`, `*.pyo`, `.pytest_cache`, `.ruff_cache`, `.mypy_cache`, `.coverage`, `htmlcov`.
3. **JavaScript / Web Build Caches:** `.turbo`, `.parcel-cache`, `.eslintcache`, stale `dist/` or `.next/cache`.
4. **Editor Artifacts:** Backup files (`*~`, `*.bak`), swap files (`*.swp`, `*.swo`), temporary files (`*.tmp`).
5. **Stray Unreferenced Files:** Unlinked screenshots, temporary test JSON outputs, or orphaned camera uploads.

> [!NOTE]
> Vital environment folders (`.git`, `.venv`, and `node_modules`) are **never** accidentally deleted.

---

## Execution Guide

### 1. Perform a Dry Run (Recommended)
Before deleting files, verify what will be cleaned:
```bash
python3 .agents/skills/workspace-cleaner/scripts/clean.py --dry-run
```
Or for a specific folder:
```bash
python3 .agents/skills/workspace-cleaner/scripts/clean.py --path "/path/to/folder" --dry-run
```

### 2. Execute the Cleanup
Run the cleaner to remove target junk files and recover disk space:
```bash
python3 .agents/skills/workspace-cleaner/scripts/clean.py
```

### 3. Check for Stray / Unreferenced Assets
To identify unreferenced large files (e.g. photos, loose PDFs, screenshots):
1. List top files by size:
   ```bash
   find . -maxdepth 2 -type f -size +100k
   ```
2. Search if the file name is referenced in the codebase:
   ```bash
   grep -rn --exclude-dir={.git,node_modules,.venv} "filename.png" .
   ```
3. If 0 occurrences exist and the file is not documentation/data, remove it.
