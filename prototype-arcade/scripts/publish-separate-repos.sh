#!/usr/bin/env bash
# Run from the exported per-game repositories directory after authenticating gh.
# This never rewrites an existing remote repository.
set -euo pipefail
for dir in */; do
  [[ -d "$dir/.git" ]] || continue
  name="${dir%/}"
  (cd "$dir" && gh repo create "$name" --private --source=. --remote=origin --push)
done
