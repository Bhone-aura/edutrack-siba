#!/usr/bin/env bash
# Script to create a GitHub repo and push the current project.
# Usage: run from anywhere: ./scripts/create_and_push_repo.sh
# It will cd to the repository root (one level up from this script) and perform actions.
set -euo pipefail

REPO_NAME="edutrack-siba"
VISIBILITY="public" # change to 'private' if you prefer
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Working directory: $ROOT_DIR"

# Ensure gh is installed
if ! command -v gh >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "GitHub CLI (gh) not found. Installing via Homebrew..."
    brew install gh
  else
    echo "GitHub CLI (gh) is not installed."
    echo "Install it manually: https://cli.github.com/manual/installation"
    exit 1
  fi
fi

# Ensure user is authenticated
if ! gh auth status >/dev/null 2>&1; then
  echo "You need to authenticate gh with your GitHub account. Running interactive login..."
  gh auth login --web || gh auth login
fi

# Initialize git if needed
if [ ! -d .git ]; then
  echo "Initializing git repository..."
  git init
fi

# Ensure .gitignore exists
if [ ! -f .gitignore ]; then
  cat > .gitignore <<'GITIGNORE'
node_modules/
dist/
build/
.vite/
.env
.env.*
.DS_Store
.vscode/
.idea/
logs/
*.log
GITIGNORE
  echo ".gitignore created"
fi

# Stage files and commit
git add .
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit -m "Initial commit"
else
  git commit -m "Prepare for GitHub push" || echo "No changes to commit"
fi

# Create repo on GitHub and push
set +e
gh repo create "$REPO_NAME" --$VISIBILITY --source=. --remote=origin --push
RC=$?
set -e

if [ $RC -ne 0 ]; then
  echo "gh repo create returned non-zero. The repo might already exist or there was an error."
  echo "Attempting to set remote 'origin' and push instead..."
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Please create the repository manually or run: gh repo create $REPO_NAME --$VISIBILITY --source=. --remote=origin --push"
    exit 1
  else
    git push -u origin HEAD
  fi
fi

# Print resulting repo URL
if command -v gh >/dev/null 2>&1; then
  echo "Repository info:"
  gh repo view "$REPO_NAME" --web || true
fi

echo "Done. If the browser didn't open, visit https://github.com/$(gh auth status --show-token 2>/dev/null | awk '/Logged in to/ {print $4}' 2>/dev/null || echo 'USERNAME')/$REPO_NAME" || true
